#include "exotic/runtime/failure_injection.hpp"
#include <cassert>
int main(){exotic::runtime::FailureInjector f;f.arm("point",2);f.check("point");bool threw=false;try{f.check("point");}catch(const exotic::runtime::InjectedFailure&){threw=true;}assert(threw);f.check("point");}
