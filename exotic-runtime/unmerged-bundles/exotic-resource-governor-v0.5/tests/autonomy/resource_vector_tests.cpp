#include "exotic/autonomy/resources/types.hpp"

#include <cassert>

int main() {
    using namespace exotic::autonomy::resources;

    ResourceVector first{{
        {ResourceDimension::MoneyUsd, 4.0},
        {ResourceDimension::ApiCredits, 10.0}
    }};
    ResourceVector second{{
        {ResourceDimension::MoneyUsd, 1.5},
        {ResourceDimension::CpuMilliseconds, 200.0}
    }};

    const auto total = first + second;
    assert(total.get(ResourceDimension::MoneyUsd) == 5.5);
    assert(total.get(ResourceDimension::ApiCredits) == 10.0);
    assert(total.get(ResourceDimension::CpuMilliseconds) == 200.0);
    assert(total.non_negative());
    assert(semantics(ResourceDimension::ConcurrencySlots) == ResourceSemantics::EphemeralCapacity);
    assert(semantics(ResourceDimension::StorageBytes) == ResourceSemantics::PersistentCapacity);
    return 0;
}
