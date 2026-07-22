#pragma once
#include "exotic/core/event.hpp"
#include <deque>
#include <mutex>
#include <optional>
#include <string>
#include <vector>

namespace exotic {
struct MemoryRecord { Id id{Id::New()}; std::string category; Value content; double importance{0.5}; };
class MemoryStore {
public:
    explicit MemoryStore(std::size_t capacity = 4096) : capacity_(capacity) {}
    Id remember(std::string category, Value content, double importance = 0.5);
    [[nodiscard]] std::vector<MemoryRecord> recall(const std::string& category, std::size_t limit = 10) const;
    [[nodiscard]] std::size_t size() const;
private:
    std::size_t capacity_;
    mutable std::mutex mutex_;
    std::deque<MemoryRecord> records_;
};
}
