#include "condition.hpp"
#include <charconv>

namespace exotic::autonomy::scheduler {
namespace {
std::optional<double> number(std::string_view value) {
    double out{}; const auto* b=value.data(); const auto* e=b+value.size();
    auto result=std::from_chars(b,e,out); if(result.ec!=std::errc{} || result.ptr!=e) return std::nullopt; return out;
}
}
bool BasicConditionEvaluator::evaluate(std::string_view key, std::string_view expression, const ConditionContext& context) const {
    auto it=context.find(std::string{key});
    if(expression=="exists") return it!=context.end();
    if(it==context.end()) return false;
    const std::string_view actual=it->second;
    auto compare=[&](std::string_view op)->std::optional<std::string_view>{ if(expression.starts_with(op)) return expression.substr(op.size()); return std::nullopt; };
    if(auto rhs=compare("==")) return actual==*rhs;
    if(auto rhs=compare("!=")) return actual!=*rhs;
    for(auto op: {std::string_view{">="}, std::string_view{"<="}, std::string_view{">"}, std::string_view{"<"}}) {
        if(auto rhs=compare(op)) { auto a=number(actual), b=number(*rhs); if(!a||!b) return false;
            if(op==">=") return *a>=*b; if(op=="<=") return *a<=*b; if(op==">") return *a>*b; return *a<*b; }
    }
    return false;
}
} // namespace exotic::autonomy::scheduler
