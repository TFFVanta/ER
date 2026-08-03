#pragma once
#include "exotic/core/id.hpp"
#include "exotic/core/entity.hpp"
#include <chrono>
#include <string>

namespace exotic {
struct Event {
    Id id{Id::New()};
    std::string type;
    Id source{};
    Id target{};
    Properties payload;
    std::chrono::system_clock::time_point timestamp{std::chrono::system_clock::now()};
};
}
