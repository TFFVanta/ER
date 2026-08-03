#include "exotic/runtime/runtime.hpp"
#include "exotic/services/services.hpp"
#include <cmath>
#include <iostream>
#include <filesystem>
#include <memory>
#include <stdexcept>

using namespace exotic;
static void require(bool condition, const char* message) { if (!condition) throw std::runtime_error(message); }
int main() {
    try {
        StateGraph graph;
        auto a = graph.create_entity("node", "A"); auto b = graph.create_entity("node", "B");
        graph.connect(a->id(), b->id(), "linked");
        require(graph.entity_count() == 2, "entity count");
        require(graph.relationship_count() == 1, "relationship count");
        require(graph.neighbors(a->id()).size() == 1, "neighbors");

        MemoryStore memory(4); memory.remember("x", 2.0, 0.8); require(memory.recall("x").size() == 1, "memory recall");
        require(std::abs(PerceptionEngine::coherence(1,1,1)-1.0) < 1e-9, "coherence");

        Runtime runtime; auto actor = runtime.graph().create_entity("identity", "tester"); auto subject = runtime.graph().create_entity("project", "test");
        runtime.graph().connect(actor->id(), subject->id(), "operates");
        runtime.security().grant(actor->id(), Permission::Execute);
        auto result = runtime.cycle(actor->id(), subject->id(), "signal", 1.0, Action{subject->id(), "run", true, 1.0});
        require(result.executed, "runtime cycle"); require(runtime.memory().size() == 2, "learning memory");
        ServiceRegistry registry;
        auto notifications = std::make_shared<NotificationService>();
        auto devices = std::make_shared<DeviceService>();
        auto ai = std::make_shared<AIService>();
        registry.add(notifications); registry.add(devices); registry.add(ai);
        registry.initialize_all(); registry.start_all();
        require(registry.health().size() == 3, "service registry");
        require(!notifications->push("info", "test", "phase2").empty(), "notification push");
        const auto device_id = devices->register_device("phone", "mobile", "test-fingerprint");
        require(devices->approve(device_id), "device approval");
        const auto proposal_id = ai->propose("proposal", "test", "test.execute");
        require(ai->decide(proposal_id, true), "proposal approval");
        require(ai->proposals().front().state == ProposalState::Approved, "proposal state");
        registry.stop_all();

        std::cout << "All Exotic tests passed.\n"; return 0;
    } catch (const std::exception& e) { std::cerr << "Test failure: " << e.what() << '\n'; return 1; }
}
