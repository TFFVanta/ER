#include "exotic/autonomy/scheduler/condition.hpp"
#include <cassert>
using namespace exotic::autonomy::scheduler;
int main(){BasicConditionEvaluator e;ConditionContext c{{"health","healthy"},{"load","42"}};assert(e.evaluate("health","==healthy",c));assert(e.evaluate("load",">=40",c));assert(!e.evaluate("load","<10",c));assert(e.evaluate("health","exists",c));}
