#include "exotic/core/event_bus.hpp"
#include <algorithm>

namespace exotic {
std::size_t EventBus::subscribe(std::string type, Handler handler) {
    std::lock_guard lock(mutex_); const auto token = next_token_++;
    subscriptions_.emplace(token, Subscription{std::move(type), std::move(handler)}); return token;
}
void EventBus::unsubscribe(std::size_t token) { std::lock_guard lock(mutex_); subscriptions_.erase(token); }
void EventBus::publish(const Event& event) const {
    std::vector<Handler> handlers;
    { std::lock_guard lock(mutex_); for (const auto& [_, sub] : subscriptions_)
        if (sub.type == "*" || sub.type == event.type) handlers.push_back(sub.handler); }
    for (const auto& handler : handlers) handler(event);
}
}
