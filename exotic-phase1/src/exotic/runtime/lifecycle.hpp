#pragma once
#include "service_graph.hpp"
#include <mutex>
namespace exotic::runtime {
class LifecycleManager {
public:void add(std::shared_ptr<RuntimeService> service);void recover_all();void start_all();void request_stop();void join();void shutdown();std::vector<ServiceHealth> health();bool running()const noexcept;
private:mutable std::mutex mutex_;ServiceGraph graph_;std::vector<std::shared_ptr<RuntimeService>> order_;std::vector<std::shared_ptr<RuntimeService>> started_;bool running_{false};
};
}
