#pragma once
#include <cstdint>
#include <optional>
#include <string>
#include <variant>

namespace exotic {
using ValueData = std::variant<std::monostate, bool, std::int64_t, double, std::string>;
class Value {
public:
    Value() = default;
    Value(bool value) : data_(value) {}
    Value(std::int64_t value) : data_(value) {}
    Value(int value) : data_(static_cast<std::int64_t>(value)) {}
    Value(double value) : data_(value) {}
    Value(std::string value) : data_(std::move(value)) {}
    Value(const char* value) : data_(std::string(value)) {}
    [[nodiscard]] const ValueData& data() const noexcept { return data_; }
    [[nodiscard]] std::string to_string() const;
    [[nodiscard]] std::optional<double> number() const;
private:
    ValueData data_{};
};
}
