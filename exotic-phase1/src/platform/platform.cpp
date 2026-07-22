#include "exotic/platform/platform.hpp"

#include <algorithm>
#include <cctype>
#include <fstream>
#include <sstream>
#include <stdexcept>

namespace exotic {
namespace fs = std::filesystem;

PlatformService::PlatformService(fs::path workspace_root)
    : workspace_root_(fs::weakly_canonical(std::move(workspace_root))) {
    if (!fs::exists(workspace_root_) || !fs::is_directory(workspace_root_)) {
        throw std::invalid_argument("Platform workspace root must be an existing directory");
    }
    record("platform", "Workspace indexed: " + workspace_root_.string());
}

std::string PlatformService::make_project_id(const fs::path& path) {
    std::string id = path.filename().string();
    std::transform(id.begin(), id.end(), id.begin(), [](unsigned char c) {
        return std::isalnum(c) ? static_cast<char>(std::tolower(c)) : '-';
    });
    while (id.find("--") != std::string::npos) id.replace(id.find("--"), 2, "-");
    return id.empty() ? "project" : id;
}

std::string PlatformService::detect_kind(const fs::path& path) {
    if (fs::exists(path / "CMakeLists.txt")) return "C++ / CMake";
    if (fs::exists(path / "package.json")) return "Node / TypeScript";
    if (fs::exists(path / "pubspec.yaml")) return "Flutter";
    if (fs::exists(path / "Cargo.toml")) return "Rust";
    if (fs::exists(path / "pyproject.toml") || fs::exists(path / "requirements.txt")) return "Python";
    return "Workspace";
}

std::vector<ProjectInfo> PlatformService::projects() const {
    std::vector<ProjectInfo> result;
    for (const auto& entry : fs::directory_iterator(workspace_root_)) {
        if (!entry.is_directory()) continue;
        const auto name = entry.path().filename().string();
        if (name.empty() || name.front() == '.' || name == "node_modules" || name == "out" || name == "build") continue;
        result.push_back(ProjectInfo{
            make_project_id(entry.path()), name, detect_kind(entry.path()), entry.path(),
            fs::exists(entry.path() / "CMakeLists.txt"), fs::exists(entry.path() / "package.json"),
            fs::exists(entry.path() / ".git")
        });
    }
    std::sort(result.begin(), result.end(), [](const auto& a, const auto& b) { return a.name < b.name; });
    return result;
}

std::optional<ProjectInfo> PlatformService::project(const std::string& id) const {
    for (const auto& item : projects()) if (item.id == id) return item;
    return std::nullopt;
}

bool PlatformService::is_safe_child(const fs::path& root, const fs::path& candidate) const {
    const auto canonical_root = fs::weakly_canonical(root);
    const auto canonical_candidate = fs::weakly_canonical(candidate);
    auto root_it = canonical_root.begin();
    auto candidate_it = canonical_candidate.begin();
    for (; root_it != canonical_root.end(); ++root_it, ++candidate_it) {
        if (candidate_it == canonical_candidate.end() || *root_it != *candidate_it) return false;
    }
    return true;
}

std::vector<FileInfo> PlatformService::files(const std::string& project_id, const fs::path& relative) const {
    const auto info = project(project_id);
    if (!info) return {};
    const auto target = info->path / relative;
    if (!is_safe_child(info->path, target) || !fs::exists(target) || !fs::is_directory(target)) return {};

    std::vector<FileInfo> result;
    for (const auto& entry : fs::directory_iterator(target)) {
        const auto name = entry.path().filename().string();
        if (name == ".git" || name == "node_modules" || name == "out" || name == "build") continue;
        std::error_code ec;
        const auto size = entry.is_regular_file() ? entry.file_size(ec) : 0;
        result.push_back(FileInfo{name, fs::relative(entry.path(), info->path).generic_string(), entry.is_directory(), ec ? 0 : size});
    }
    std::sort(result.begin(), result.end(), [](const auto& a, const auto& b) {
        if (a.directory != b.directory) return a.directory > b.directory;
        return a.name < b.name;
    });
    return result;
}

std::optional<std::string> PlatformService::read_text_file(const std::string& project_id,
                                                           const fs::path& relative,
                                                           std::size_t max_bytes) const {
    const auto info = project(project_id);
    if (!info) return std::nullopt;
    const auto target = info->path / relative;
    if (!is_safe_child(info->path, target) || !fs::exists(target) || !fs::is_regular_file(target)) return std::nullopt;
    if (fs::file_size(target) > max_bytes) return std::nullopt;

    static const std::vector<std::string> allowed = {
        ".txt", ".md", ".json", ".yaml", ".yml", ".toml", ".xml", ".html", ".css", ".js", ".ts", ".tsx",
        ".cpp", ".cc", ".c", ".hpp", ".h", ".cs", ".py", ".rs", ".dart", ".java", ".kt", ".gradle", ".cmake"
    };
    const auto extension = target.extension().string();
    const auto filename = target.filename().string();
    if (std::find(allowed.begin(), allowed.end(), extension) == allowed.end() &&
        filename != "CMakeLists.txt" && filename != "Dockerfile" && filename != "Makefile") return std::nullopt;

    std::ifstream input(target, std::ios::binary);
    if (!input) return std::nullopt;
    std::ostringstream content;
    content << input.rdbuf();
    return content.str();
}

void PlatformService::record(std::string category, std::string message, bool success) {
    std::scoped_lock lock(audit_mutex_);
    audit_.push_back(AuditEntry{std::chrono::system_clock::now(), std::move(category), std::move(message), success});
    constexpr std::size_t capacity = 1000;
    if (audit_.size() > capacity) audit_.erase(audit_.begin(), audit_.begin() + static_cast<std::ptrdiff_t>(audit_.size() - capacity));
}

std::vector<AuditEntry> PlatformService::recent_activity(std::size_t limit) const {
    std::scoped_lock lock(audit_mutex_);
    limit = std::min(limit, audit_.size());
    return std::vector<AuditEntry>(audit_.end() - static_cast<std::ptrdiff_t>(limit), audit_.end());
}

} // namespace exotic
