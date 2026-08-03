#include "exotic/codex_operator/operator.hpp"

#include <filesystem>
#include <fstream>
#include <sstream>

namespace exotic::codex_operator {

namespace {

std::string escape_json(std::string_view input) {
    std::ostringstream out;
    for (const char ch : input) {
        switch (ch) {
        case '\\': out << "\\\\"; break;
        case '"': out << "\\\""; break;
        case '\n': out << "\\n"; break;
        case '\r': out << "\\r"; break;
        case '\t': out << "\\t"; break;
        default: out << ch; break;
        }
    }
    return out.str();
}

std::string to_json(const StructuredLogEntry& entry) {
    std::ostringstream out;
    out << "{"
        << "\"timestamp\":\"" << escape_json(to_iso8601(entry.timestamp)) << "\","
        << "\"level\":\"" << escape_json(to_string(entry.level)) << "\","
        << "\"category\":\"" << escape_json(entry.category) << "\","
        << "\"message\":\"" << escape_json(entry.message) << "\","
        << "\"fields\":{";
    bool first = true;
    for (const auto& [key, value] : entry.fields) {
        if (!first) {
            out << ",";
        }
        first = false;
        out << "\"" << escape_json(key) << "\":\"" << escape_json(value) << "\"";
    }
    out << "}}";
    return out.str();
}

} // namespace

void MemoryLogSink::write(const StructuredLogEntry& entry) {
    std::scoped_lock lock(mutex_);
    entries_.push_back(entry);
}

std::vector<StructuredLogEntry> MemoryLogSink::entries() const {
    std::scoped_lock lock(mutex_);
    return entries_;
}

JsonLineLogSink::JsonLineLogSink(std::filesystem::path path) : path_(std::move(path)) {
    std::filesystem::create_directories(path_.parent_path());
}

void JsonLineLogSink::write(const StructuredLogEntry& entry) {
    std::scoped_lock lock(mutex_);
    std::ofstream output(path_, std::ios::binary | std::ios::app);
    output << to_json(entry) << '\n';
}

std::filesystem::path JsonLineLogSink::path() const {
    return path_;
}

StructuredLogger::StructuredLogger(LogLevel minimum_level) : minimum_level_(minimum_level) {}

void StructuredLogger::add_sink(std::shared_ptr<StructuredLogSink> sink) {
    if (sink) {
        sinks_.push_back(std::move(sink));
    }
}

void StructuredLogger::set_minimum_level(LogLevel level) noexcept {
    minimum_level_ = level;
}

LogLevel StructuredLogger::minimum_level() const noexcept {
    return minimum_level_;
}

void StructuredLogger::log(LogLevel level,
                           std::string category,
                           std::string message,
                           std::map<std::string, std::string> fields) const {
    if (static_cast<int>(level) < static_cast<int>(minimum_level_)) {
        return;
    }
    StructuredLogEntry entry;
    entry.level = level;
    entry.category = std::move(category);
    entry.message = std::move(message);
    entry.fields = std::move(fields);
    for (const auto& sink : sinks_) {
        sink->write(entry);
    }
}

void StructuredLogger::trace(std::string category, std::string message, std::map<std::string, std::string> fields) const {
    log(LogLevel::Trace, std::move(category), std::move(message), std::move(fields));
}

void StructuredLogger::debug(std::string category, std::string message, std::map<std::string, std::string> fields) const {
    log(LogLevel::Debug, std::move(category), std::move(message), std::move(fields));
}

void StructuredLogger::info(std::string category, std::string message, std::map<std::string, std::string> fields) const {
    log(LogLevel::Info, std::move(category), std::move(message), std::move(fields));
}

void StructuredLogger::warning(std::string category, std::string message, std::map<std::string, std::string> fields) const {
    log(LogLevel::Warning, std::move(category), std::move(message), std::move(fields));
}

void StructuredLogger::error(std::string category, std::string message, std::map<std::string, std::string> fields) const {
    log(LogLevel::Error, std::move(category), std::move(message), std::move(fields));
}

void StructuredLogger::critical(std::string category, std::string message, std::map<std::string, std::string> fields) const {
    log(LogLevel::Critical, std::move(category), std::move(message), std::move(fields));
}

} // namespace exotic::codex_operator
