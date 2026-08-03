#include "exotic/core/id.hpp"
#include <atomic>
#include <chrono>
#include <iomanip>
#include <sstream>

namespace exotic {
Id Id::New() {
    static std::atomic<std::uint64_t> counter{1};
    const auto now = static_cast<std::uint64_t>(
        std::chrono::steady_clock::now().time_since_epoch().count());
    return Id{(now << 16U) ^ counter.fetch_add(1, std::memory_order_relaxed)};
}
std::string Id::str() const {
    std::ostringstream out;
    out << std::hex << std::setw(16) << std::setfill('0') << value_;
    return out.str();
}
}
