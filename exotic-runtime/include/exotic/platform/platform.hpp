#pragma once

#include <chrono>
#include <cstdint>
#include <filesystem>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

namespace exotic {

struct ProjectInfo {
    std::string id;
    std::string name;
    std::string kind;
    std::filesystem::path path;
    bool has_cmake{false};
    bool has_node{false};
    bool has_git{false};
};

struct FileInfo {
    std::string name;
    std::string relative_path;
    bool directory{false};
    std::uintmax_t size{0};
};

struct AuditEntry {
    std::chrono::system_clock::time_point timestamp;
    std::string category;
    std::string message;
    bool success{true};
};

class PlatformService {
public:
    explicit PlatformService(std::filesystem::path workspace_root);

    [[nodiscard]] const std::filesystem::path& workspace_root() const noexcept { return workspace_root_; }
    [[nodiscard]] std::vector<ProjectInfo> projects() const;
    [[nodiscard]] std::optional<ProjectInfo> project(const std::string& id) const;
    [[nodiscard]] std::vector<FileInfo> files(const std::string& project_id,
                                              const std::filesystem::path& relative = {}) const;
    [[nodiscard]] std::optional<std::string> read_text_file(const std::string& project_id,
                                                            const std::filesystem::path& relative,
                                                            std::size_t max_bytes = 262144) const;

    void record(std::string category, std::string message, bool success = true);
    [[nodiscard]] std::vector<AuditEntry> recent_activity(std::size_t limit = 80) const;

private:
    [[nodiscard]] static std::string make_project_id(const std::filesystem::path& path);
    [[nodiscard]] static std::string detect_kind(const std::filesystem::path& path);
    [[nodiscard]] bool is_safe_child(const std::filesystem::path& root,
                                     const std::filesystem::path& candidate) const;

    std::filesystem::path workspace_root_;
    mutable std::mutex audit_mutex_;
    std::vector<AuditEntry> audit_;
};

} // namespace exotic
