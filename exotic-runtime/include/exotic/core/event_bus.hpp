#pragma once
#include "exotic/core/event.hpp"
#include <functional>
#include <mutex>
#include <string>
#include <unordered_map>
#include <vector>

namespace exotic {
class EventBus {
public:
    using Handler = std::function<void(const Event&)>;
    std::size_t subscribe(std::string type, Handler handler);
    void unsubscribe(std::size_t token);
    void publish(const Event& event) const;
private:
    struct Subscription { std::string type; Handler handler; };
    mutable std::mutex mutex_;
    mutable std::unordered_map<std::size_t, Subscription> subscriptions_;
    std::size_t next_token_{1};
};
}
