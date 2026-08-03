#pragma once
#include <optional>
#include <string>
#include <string_view>
#include <unordered_map>

namespace exotic::autonomy::scheduler {

using ConditionContext = std::unordered_map<std::string, std::string>;

class ConditionEvaluator {
public:
    virtual ~ConditionEvaluator() = default;
    virtual bool evaluate(std::string_view key, std::string_view expression, const ConditionContext& context) const = 0;
};

// Intentionally small, deterministic evaluator for v0.3.
// Expressions: exists, ==value, !=value, >number, >=number, <number, <=number.
class BasicConditionEvaluator final : public ConditionEvaluator {
public:
    bool evaluate(std::string_view key, std::string_view expression, const ConditionContext& context) const override;
};

} // namespace exotic::autonomy::scheduler
