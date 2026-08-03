#pragma once
#include <cstdint>
#include <string>

namespace exotic {
class Id {
public:
    Id() = default;
    explicit Id(std::uint64_t value) : value_(value) {}
    [[nodiscard]] static Id New();
    [[nodiscard]] std::uint64_t value() const noexcept { return value_; }
    [[nodiscard]] std::string str() const;
    auto operator<=>(const Id&) const = default;
private:
    std::uint64_t value_{0};
};
}

template<> struct std::hash<exotic::Id> {
    std::size_t operator()(const exotic::Id& id) const noexcept {
        return std::hash<std::uint64_t>{}(id.value());
    }
};
