#pragma once
#include "exotic/core/id.hpp"
#include <mutex>
#include <string>
#include <unordered_map>
#include <unordered_set>

namespace exotic {
enum class Permission { Read, Write, Execute, Admin };
class SecurityLayer {
public:
    void grant(Id actor, Permission permission);
    void revoke(Id actor, Permission permission);
    [[nodiscard]] bool allowed(Id actor, Permission permission) const;
    [[nodiscard]] std::string issue_token(Id actor) const;
    [[nodiscard]] bool verify_token(Id actor, const std::string& token) const;
private:
    mutable std::mutex mutex_;
    std::unordered_map<Id, std::unordered_set<Permission>> permissions_;
};
}
