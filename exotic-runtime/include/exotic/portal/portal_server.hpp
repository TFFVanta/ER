#pragma once

#include "exotic/platform/platform.hpp"
#include "exotic/runtime/runtime.hpp"
#include <cstdint>
#include <filesystem>
#include <memory>
#include <string>

namespace exotic {

struct PortalOptions {
    std::uint16_t port{8787};
    bool allow_remote{true};
    std::filesystem::path workspace_root{"."};
};

class PortalServer {
public:
    PortalServer(Runtime& runtime, PortalOptions options = {});
    ~PortalServer();

    PortalServer(const PortalServer&) = delete;
    PortalServer& operator=(const PortalServer&) = delete;

    int run();
    void stop() noexcept;

    [[nodiscard]] const std::string& token() const noexcept { return token_; }
    [[nodiscard]] std::uint16_t port() const noexcept { return options_.port; }
    [[nodiscard]] std::string local_url() const;

private:
    Runtime& runtime_;
    PortalOptions options_;
    PlatformService platform_;
    std::string token_;
    bool running_{false};
    std::intptr_t listen_socket_{-1};
};

} // namespace exotic
