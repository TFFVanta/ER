#include "exotic/core/memory.hpp"
#include <algorithm>

namespace exotic {
Id MemoryStore::remember(std::string category, Value content, double importance) {
    std::lock_guard lock(mutex_); MemoryRecord record{Id::New(), std::move(category), std::move(content), std::clamp(importance, 0.0, 1.0)};
    const auto id = record.id; records_.push_back(std::move(record)); if (records_.size() > capacity_) records_.pop_front(); return id;
}
std::vector<MemoryRecord> MemoryStore::recall(const std::string& category, std::size_t limit) const {
    std::lock_guard lock(mutex_); std::vector<MemoryRecord> out;
    for (auto it = records_.rbegin(); it != records_.rend() && out.size() < limit; ++it) if (it->category == category) out.push_back(*it);
    std::sort(out.begin(), out.end(), [](const auto& a, const auto& b){ return a.importance > b.importance; }); return out;
}
std::size_t MemoryStore::size() const { std::lock_guard lock(mutex_); return records_.size(); }
}
