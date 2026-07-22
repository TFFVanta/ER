#include "exotic/core/value.hpp"
#include <sstream>

namespace exotic {
std::string Value::to_string() const {
    return std::visit([](const auto& v) -> std::string {
        using T = std::decay_t<decltype(v)>;
        if constexpr (std::is_same_v<T, std::monostate>) return "null";
        else if constexpr (std::is_same_v<T, bool>) return v ? "true" : "false";
        else if constexpr (std::is_same_v<T, std::string>) return v;
        else { std::ostringstream out; out << v; return out.str(); }
    }, data_);
}
std::optional<double> Value::number() const {
    if (const auto* v = std::get_if<double>(&data_)) return *v;
    if (const auto* v = std::get_if<std::int64_t>(&data_)) return static_cast<double>(*v);
    return std::nullopt;
}
}
