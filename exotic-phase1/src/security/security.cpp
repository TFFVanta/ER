#include "exotic/security/security.hpp"
#include <functional>

namespace exotic {
void SecurityLayer::grant(Id actor, Permission permission) { std::lock_guard lock(mutex_); permissions_[actor].insert(permission); }
void SecurityLayer::revoke(Id actor, Permission permission) { std::lock_guard lock(mutex_); permissions_[actor].erase(permission); }
bool SecurityLayer::allowed(Id actor, Permission permission) const {
    std::lock_guard lock(mutex_); const auto it = permissions_.find(actor);
    return it != permissions_.end() && (it->second.contains(permission) || it->second.contains(Permission::Admin));
}
std::string SecurityLayer::issue_token(Id actor) const {
    return std::to_string(std::hash<std::string>{}("exotic:" + actor.str() + ":v1"));
}
bool SecurityLayer::verify_token(Id actor, const std::string& token) const { return issue_token(actor) == token; }
}
