#pragma once
#include "exotic/core/event_bus.hpp"
#include "exotic/platform/platform.hpp"
#include <atomic>
#include <chrono>
#include <filesystem>
#include <functional>
#include <map>
#include <memory>
#include <mutex>
#include <optional>
#include <queue>
#include <string>
#include <unordered_map>
#include <vector>

namespace exotic {

enum class ServiceState { Created, Initialized, Running, Stopped, Failed };
struct ServiceHealth { ServiceState state{ServiceState::Created}; bool healthy{true}; std::string detail{"created"}; std::uint64_t operations{0}; };

class IService {
public:
    virtual ~IService() = default;
    [[nodiscard]] virtual std::string name() const = 0;
    virtual void initialize() = 0;
    virtual void start() = 0;
    virtual void stop() noexcept = 0;
    [[nodiscard]] virtual ServiceHealth health() const = 0;
};

class ServiceRegistry {
public:
    void add(std::shared_ptr<IService> service);
    void initialize_all();
    void start_all();
    void stop_all() noexcept;
    [[nodiscard]] std::shared_ptr<IService> get(const std::string& name) const;
    [[nodiscard]] std::vector<std::pair<std::string, ServiceHealth>> health() const;
private:
    std::map<std::string, std::shared_ptr<IService>> services_;
};

struct SearchHit { std::string project_id; std::string path; std::size_t line{0}; std::string preview; };
class SearchService final : public IService {
public:
    explicit SearchService(PlatformService& platform);
    std::string name() const override { return "search"; }
    void initialize() override; void start() override; void stop() noexcept override;
    ServiceHealth health() const override;
    [[nodiscard]] std::vector<SearchHit> search(const std::string& query, std::size_t limit = 100);
private:
    PlatformService& platform_; mutable std::mutex mutex_; ServiceHealth health_;
};

enum class JobState { Queued, Running, Succeeded, Failed, Cancelled };
struct BuildProfile { std::string id; std::string label; std::vector<std::string> command; };
struct BuildJob { std::string id; std::string project_id; std::string profile_id; JobState state{JobState::Queued}; int exit_code{-1}; std::string log; std::chrono::system_clock::time_point created; };
class BuildService final : public IService {
public:
    BuildService(PlatformService& platform, EventBus& events);
    std::string name() const override { return "build"; }
    void initialize() override; void start() override; void stop() noexcept override;
    ServiceHealth health() const override;
    void register_profile(BuildProfile profile);
    [[nodiscard]] std::vector<BuildProfile> profiles() const;
    [[nodiscard]] std::string queue(const std::string& project_id, const std::string& profile_id);
    bool run_next();
    [[nodiscard]] std::vector<BuildJob> jobs(std::size_t limit = 50) const;
private:
    static bool safe_token(const std::string& token);
    PlatformService& platform_; EventBus& events_; mutable std::mutex mutex_; ServiceHealth health_;
    std::map<std::string, BuildProfile> profiles_; std::vector<BuildJob> jobs_; std::queue<std::size_t> pending_;
};

struct Notification { std::string id; std::string level; std::string title; std::string message; bool read{false}; std::chrono::system_clock::time_point created; };
class NotificationService final : public IService {
public:
    std::string name() const override { return "notifications"; }
    void initialize() override; void start() override; void stop() noexcept override; ServiceHealth health() const override;
    std::string push(std::string level, std::string title, std::string message);
    [[nodiscard]] std::vector<Notification> list(std::size_t limit = 100) const;
    bool mark_read(const std::string& id);
private: mutable std::mutex mutex_; ServiceHealth health_; std::vector<Notification> items_;
};

struct DeviceIdentity { std::string id; std::string name; std::string kind; std::string fingerprint; bool approved{false}; std::chrono::system_clock::time_point last_seen; };
class DeviceService final : public IService {
public:
    std::string name() const override { return "devices"; }
    void initialize() override; void start() override; void stop() noexcept override; ServiceHealth health() const override;
    std::string register_device(std::string name, std::string kind, std::string fingerprint);
    bool approve(const std::string& id); bool revoke(const std::string& id);
    [[nodiscard]] std::vector<DeviceIdentity> devices() const;
private: mutable std::mutex mutex_; ServiceHealth health_; std::vector<DeviceIdentity> devices_;
};

enum class ProposalState { Proposed, Approved, Rejected, Executed };
struct AIProposal { std::string id; std::string title; std::string rationale; std::string capability; ProposalState state{ProposalState::Proposed}; };
class AIService final : public IService {
public:
    std::string name() const override { return "ai"; }
    void initialize() override; void start() override; void stop() noexcept override; ServiceHealth health() const override;
    std::string propose(std::string title, std::string rationale, std::string capability);
    bool decide(const std::string& id, bool approve);
    [[nodiscard]] std::vector<AIProposal> proposals() const;
private: mutable std::mutex mutex_; ServiceHealth health_; std::vector<AIProposal> proposals_;
};

struct WorkflowStep { std::string name; std::function<bool()> action; };
struct WorkflowRun { std::string id; std::string name; JobState state{JobState::Queued}; std::size_t completed_steps{0}; std::string detail; };
class AutomationService final : public IService {
public:
    explicit AutomationService(EventBus& events);
    std::string name() const override { return "automation"; }
    void initialize() override; void start() override; void stop() noexcept override; ServiceHealth health() const override;
    std::string run(std::string name, std::vector<WorkflowStep> steps);
    [[nodiscard]] std::vector<WorkflowRun> runs() const;
private: EventBus& events_; mutable std::mutex mutex_; ServiceHealth health_; std::vector<WorkflowRun> runs_;
};

} // namespace exotic
