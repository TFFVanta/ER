#include "exotic/autonomy/scheduler/retry.hpp"
#include <cassert>
using namespace exotic::autonomy::scheduler;
int main(){RetryPolicy p;p.initial_delay=std::chrono::milliseconds{100};p.maximum_delay=std::chrono::milliseconds{1000};p.multiplier=2.0;p.jitter_fraction=0.0;RetryCalculator c{1};assert(c.next_delay(p,1)==std::chrono::milliseconds{100});assert(c.next_delay(p,2)==std::chrono::milliseconds{200});assert(c.next_delay(p,10)==std::chrono::milliseconds{1000});}
