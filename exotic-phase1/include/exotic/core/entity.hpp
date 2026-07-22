#pragma once
#include "exotic/core/id.hpp"
#include "exotic/core/value.hpp"
#include <shared_mutex>
#include <string>
#include <unordered_map>

namespace exotic {
using Properties = std::unordered_map<std::string, Value>;
struct Component {
    Id id{Id::New()};
    std::string type;
    Properties properties;
};
class Entity {
public:
    explicit Entity(std::string type, std::string name = {});
    [[nodiscard]] Id id() const noexcept { return id_; }
    [[nodiscard]] const std::string& type() const noexcept { return type_; }
    [[nodiscard]] const std::string& name() const noexcept { return name_; }
    void set(std::string key, Value value);
    [[nodiscard]] Value get(const std::string& key) const;
    void attach(Component component);
    [[nodiscard]] bool has_component(const std::string& type) const;
    [[nodiscard]] Properties snapshot() const;
private:
    Id id_{Id::New()};
    std::string type_;
    std::string name_;
    mutable std::shared_mutex mutex_;
    Properties state_;
    std::unordered_map<std::string, Component> components_;
};
}
