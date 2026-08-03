#pragma once

#include "repository.hpp"

namespace exotic::autonomy::resources {

class CircuitBreakerService {
public:
    explicit CircuitBreakerService(ResourceRepository& repository);

    [[nodiscard]] bool allow(std::string_view scope_key, TimePoint now, std::string& reason);
    void record_success(std::string_view scope_key, TimePoint now = Clock::now());
    void record_failure(std::string_view scope_key, std::string_view reason, TimePoint now = Clock::now());

private:
    ResourceRepository& repository_;

    CircuitBreaker get_or_create(std::string_view scope_key);
};

} // namespace exotic::autonomy::resources
