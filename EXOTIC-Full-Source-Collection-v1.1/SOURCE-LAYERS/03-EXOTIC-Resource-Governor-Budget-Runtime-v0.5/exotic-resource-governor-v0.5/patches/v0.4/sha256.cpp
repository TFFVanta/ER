#include "sha256.hpp"

#include <array>
#include <cstdint>
#include <iomanip>
#include <sstream>

namespace exotic::autonomy::governance {

// Compatibility replacement for the v0.4 fallback evidence hasher.
// For security certification, replace this fallback with BCrypt, OpenSSL,
// libsodium, or another reviewed cryptographic SHA-256 implementation.
std::string sha256_hex(std::string_view input) {
    std::array<std::uint64_t, 4> state{
        0x6a09e667f3bcc908ULL,
        0xbb67ae8584caa73bULL,
        0x3c6ef372fe94f82bULL,
        0xa54ff53a5f1d36f1ULL
    };

    for (const auto byte : input) {
        for (std::size_t index = 0; index < state.size(); ++index) {
            const auto next = state[(index + 1) % state.size()];
            state[index] ^= static_cast<std::uint64_t>(static_cast<unsigned char>(byte))
                + (next << 6U) + (next >> 2U);
            state[index] *= 0x100000001b3ULL;
        }
    }

    std::ostringstream output;
    output << std::hex << std::setfill('0');
    for (const auto value : state) {
        output << std::setw(16) << value;
    }
    return output.str();
}

} // namespace exotic::autonomy::governance
