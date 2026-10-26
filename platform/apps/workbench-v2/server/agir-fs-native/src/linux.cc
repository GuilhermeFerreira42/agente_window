#include <node_api.h>
#include <linux/openat2.h>
#include <sys/syscall.h>
#include <sys/stat.h>
#include <sys/types.h>
#include <dirent.h>
#include <fcntl.h>
#include <unistd.h>
#include <errno.h>
#include <stdint.h>
#include <stdlib.h>
#include <string.h>
#include <string>
#include <vector>

#ifndef RENAME_NOREPLACE
#define RENAME_NOREPLACE (1 << 0)
#endif
#ifndef RESOLVE_NO_XDEV
#define RESOLVE_NO_XDEV 0x01
#endif

struct SandboxRoot {
  int fd;
};

static const uint64_t kResolveBeneath = RESOLVE_BENEATH | RESOLVE_NO_SYMLINKS |
                                        RESOLVE_NO_MAGICLINKS | RESOLVE_NO_XDEV;
static const uint64_t kResolveRoot = RESOLVE_NO_SYMLINKS | RESOLVE_NO_MAGICLINKS;

static int openat2_call(int dirfd, const char* path, uint64_t flags, uint64_t mode,
                        uint64_t resolve) {
  struct open_how how = {};
  how.flags = flags;
  how.mode = mode;
  how.resolve = resolve;
  return static_cast<int>(syscall(SYS_openat2, dirfd, path, &how, sizeof(how)));
}

static const char* errno_name(int error) {
  switch (error) {
    case EACCES: return "EACCES";
    case EEXIST: return "EEXIST";
    case EINVAL: return "EINVAL";
    case EIO: return "EIO";
    case EISDIR: return "EISDIR";
    case ELOOP: return "ELOOP";
    case EMFILE: return "EMFILE";
    case ENFILE: return "ENFILE";
    case ENOENT: return "ENOENT";
    case ENOSPC: return "ENOSPC";
    case ENOTDIR: return "ENOTDIR";
    case ENOTEMPTY: return "ENOTEMPTY";
    case ENOSYS: return "ENOSYS";
    case EPERM: return "EPERM";
    case EXDEV: return "EXDEV";
    case EAGAIN: return "EAGAIN";
    case EOPNOTSUPP: return "EOPNOTSUPP";
    default: return "EIO";
  }
}

static napi_value throw_errno(napi_env env, const char* operation, int error) {
  std::string message = std::string(operation) + ": secure filesystem operation refused (" +
                       errno_name(error) + ")";
  napi_throw_error(env, errno_name(error), message.c_str());
  return nullptr;
}

static bool get_string(napi_env env, napi_value value, std::string* output) {
  size_t length = 0;
  if (napi_get_value_string_utf8(env, value, nullptr, 0, &length) != napi_ok) return false;
  std::vector<char> buffer(length + 1);
  if (napi_get_value_string_utf8(env, value, buffer.data(), buffer.size(), &length) != napi_ok) return false;
  output->assign(buffer.data(), length);
  return true;
}

static bool get_root(napi_env env, napi_value self, SandboxRoot** root) {
  return napi_unwrap(env, self, reinterpret_cast<void**>(root)) == napi_ok &&
         root != nullptr && *root != nullptr && (*root)->fd >= 0;
}

static void finalize_root(napi_env, void* data, void*) {
  SandboxRoot* root = static_cast<SandboxRoot*>(data);
  if (root != nullptr) {
    if (root->fd >= 0) close(root->fd);
    delete root;
  }
}

static bool split_path(const std::string& path, std::vector<std::string>* parts,
                       bool allow_root) {
  if (path.empty() || path == ".") return allow_root;
  if (path.front() == '/' || path.find('\0') != std::string::npos) return false;
  size_t start = 0;
  while (start <= path.size()) {
    size_t end = path.find('/', start);
    if (end == std::string::npos) end = path.size();
    std::string part = path.substr(start, end - start);
    if (part.empty() || part == "." || part == "..") return false;
    parts->push_back(std::move(part));
    if (end == path.size()) break;
    start = end + 1;
  }
  return !parts->empty();
}

static int open_dir_relative(int rootfd, const std::string& path) {
  if (path.empty() || path == ".") {
    return openat2_call(rootfd, ".", O_RDONLY | O_DIRECTORY | O_CLOEXEC, 0,
                        kResolveBeneath);
  }
  return openat2_call(rootfd, path.c_str(), O_RDONLY | O_DIRECTORY | O_CLOEXEC, 0,
                      kResolveBeneath);
}

static bool stat_regular_single_link(int fd, struct stat* info) {
  if (fstat(fd, info) != 0) return false;
  if (!S_ISREG(info->st_mode) || info->st_nlink != 1) {
    errno = EPERM;
    return false;
  }
  return true;
}

static bool write_all(int fd, const char* data, size_t length) {
  size_t offset = 0;
  while (offset < length) {
    ssize_t count = write(fd, data + offset, length - offset);
    if (count < 0) {
      if (errno == EINTR) continue;
      return false;
    }
    if (count == 0) {
      errno = EIO;
      return false;
    }
    offset += static_cast<size_t>(count);
  }
  return true;
}

static bool read_all(int fd, std::string* result) {
  char buffer[65536];
  for (;;) {
    ssize_t count = read(fd, buffer, sizeof(buffer));
    if (count < 0) {
      if (errno == EINTR) continue;
      return false;
    }
    if (count == 0) return true;
    result->append(buffer, static_cast<size_t>(count));
  }
}

static bool open_parent(SandboxRoot* root, const std::string& relative,
                        bool create_missing, int* parent_fd,
                        std::string* basename, std::string* parent_relative) {
  std::vector<std::string> parts;
  if (!split_path(relative, &parts, false) || parts.empty()) {
    errno = EINVAL;
    return false;
  }
  *basename = parts.back();
  parts.pop_back();
  parent_relative->clear();
  for (size_t index = 0; index < parts.size(); ++index) {
    if (index > 0) parent_relative->push_back('/');
    parent_relative->append(parts[index]);
  }
  if (parent_relative->empty()) *parent_relative = ".";

  int current = dup(root->fd);
  if (current < 0) return false;
  for (const std::string& component : parts) {
    int next = openat2_call(current, component.c_str(), O_PATH | O_DIRECTORY | O_CLOEXEC,
                            0, kResolveBeneath);
    if (next < 0 && errno == ENOENT && create_missing) {
      if (mkdirat(current, component.c_str(), 0755) != 0 && errno != EEXIST) {
        int saved = errno;
        close(current);
        errno = saved;
        return false;
      }
      next = openat2_call(current, component.c_str(), O_PATH | O_DIRECTORY | O_CLOEXEC,
                          0, kResolveBeneath);
    }
    if (next < 0) {
      int saved = errno;
      close(current);
      errno = saved;
      return false;
    }
    close(current);
    current = next;
  }
  *parent_fd = current;
  return true;
}

static bool same_directory(int rootfd, const std::string& relative, int pinned_fd) {
  int fresh = open_dir_relative(rootfd, relative);
  if (fresh < 0) return false;
  struct stat expected = {};
  struct stat observed = {};
  bool same = fstat(pinned_fd, &expected) == 0 && fstat(fresh, &observed) == 0 &&
              expected.st_dev == observed.st_dev && expected.st_ino == observed.st_ino;
  close(fresh);
  if (!same) errno = EAGAIN;
  return same;
}

static bool create_temp_file(int parentfd, std::string* name, const char* data,
                             size_t length) {
  static uint64_t counter = 0;
  int fd = -1;
  for (int attempt = 0; attempt < 64; ++attempt) {
    uint64_t value = __atomic_add_fetch(&counter, 1, __ATOMIC_RELAXED);
    *name = ".agente-window-tmp-" + std::to_string(getpid()) + "-" + std::to_string(value);
    fd = openat2_call(parentfd, name->c_str(),
                      O_WRONLY | O_CREAT | O_EXCL | O_CLOEXEC | O_NOFOLLOW,
                      0600, kResolveBeneath);
    if (fd >= 0) break;
    if (errno != EEXIST) return false;
  }
  if (fd < 0) {
    errno = EEXIST;
    return false;
  }
  bool ok = write_all(fd, data, length) && fsync(fd) == 0;
  int saved = errno;
  close(fd);
  if (!ok) {
    unlinkat(parentfd, name->c_str(), 0);
    errno = saved;
  }
  return ok;
}

static napi_value root_constructor(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value self;
  napi_get_cb_info(env, info, &argc, args, &self, nullptr);
  if (argc != 1) {
    napi_throw_type_error(env, "EINVAL", "SandboxRoot requires a canonical workspace path.");
    return nullptr;
  }
  std::string path;
  if (!get_string(env, args[0], &path) || path.empty() || path.front() != '/') {
    napi_throw_type_error(env, "EINVAL", "SandboxRoot requires an absolute canonical POSIX path.");
    return nullptr;
  }
  int fd = openat2_call(AT_FDCWD, path.c_str(), O_PATH | O_DIRECTORY | O_CLOEXEC, 0,
                        kResolveRoot);
  if (fd < 0) return throw_errno(env, "open trusted workspace root", errno);
  struct stat info_stat = {};
  if (fstat(fd, &info_stat) != 0) {
    int saved = errno;
    close(fd);
    return throw_errno(env, "verify trusted workspace root", saved);
  }
  if (!S_ISDIR(info_stat.st_mode)) {
    close(fd);
    return throw_errno(env, "verify trusted workspace root", ENOTDIR);
  }
  SandboxRoot* root = new SandboxRoot{fd};
  if (napi_wrap(env, self, root, finalize_root, nullptr, nullptr) != napi_ok) {
    close(fd);
    delete root;
    napi_throw_error(env, "EIO", "Could not retain workspace directory handle.");
    return nullptr;
  }
  return self;
}

static napi_value read_file(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value self;
  napi_get_cb_info(env, info, &argc, args, &self, nullptr);
  SandboxRoot* root = nullptr;
  if (argc != 1 || !get_root(env, self, &root)) {
    napi_throw_type_error(env, "EINVAL", "Invalid secure workspace handle or path.");
    return nullptr;
  }
  std::string path;
  std::vector<std::string> parts;
  if (!get_string(env, args[0], &path) || !split_path(path, &parts, false)) {
    napi_throw_type_error(env, "EINVAL", "Secure file paths must be normalized and workspace-relative.");
    return nullptr;
  }
  int fd = openat2_call(root->fd, path.c_str(), O_RDONLY | O_CLOEXEC, 0, kResolveBeneath);
  if (fd < 0) return throw_errno(env, "open workspace file", errno);
  struct stat st = {};
  if (!stat_regular_single_link(fd, &st)) {
    int saved = errno;
    close(fd);
    return throw_errno(env, "reject non-regular or multiply-linked file", saved);
  }
  std::string content;
  bool ok = read_all(fd, &content);
  int saved = errno;
  close(fd);
  if (!ok) return throw_errno(env, "read workspace file", saved);
  napi_value output;
  void* copied = nullptr;
  if (napi_create_buffer_copy(env, content.size(), content.data(), &copied, &output) != napi_ok) {
    napi_throw_error(env, "ENOMEM", "Could not return file contents.");
    return nullptr;
  }
  return output;
}

static napi_value read_directory(napi_env env, napi_callback_info info) {
  size_t argc = 1;
  napi_value args[1];
  napi_value self;
  napi_get_cb_info(env, info, &argc, args, &self, nullptr);
  SandboxRoot* root = nullptr;
  if (argc != 1 || !get_root(env, self, &root)) {
    napi_throw_type_error(env, "EINVAL", "Invalid secure workspace handle or path.");
    return nullptr;
  }
  std::string path;
  if (!get_string(env, args[0], &path)) {
    napi_throw_type_error(env, "EINVAL", "Directory path must be a string.");
    return nullptr;
  }
  int fd = open_dir_relative(root->fd, path);
  if (fd < 0) return throw_errno(env, "open workspace directory", errno);
  int scan_fd = dup(fd);
  if (scan_fd < 0) {
    int saved = errno;
    close(fd);
    return throw_errno(env, "duplicate workspace directory handle", saved);
  }
  DIR* directory = fdopendir(scan_fd);
  if (directory == nullptr) {
    int saved = errno;
    close(scan_fd);
    close(fd);
    return throw_errno(env, "enumerate workspace directory", saved);
  }
  napi_value output;
  napi_create_array(env, &output);
  uint32_t index = 0;
  int read_error = 0;
  struct dirent* entry;
  for (;;) {
    errno = 0;
    entry = readdir(directory);
    if (entry == nullptr) {
      read_error = errno;
      break;
    }
    if (strcmp(entry->d_name, ".") == 0 || strcmp(entry->d_name, "..") == 0) continue;
    struct stat st = {};
    if (fstatat(fd, entry->d_name, &st, AT_SYMLINK_NOFOLLOW) != 0) {
      if (errno == ENOENT) continue;
      int saved = errno;
      closedir(directory);
      close(fd);
      return throw_errno(env, "inspect workspace directory entry", saved);
    }
    napi_value item, name, kind, size;
    napi_create_object(env, &item);
    napi_create_string_utf8(env, entry->d_name, NAPI_AUTO_LENGTH, &name);
    const char* kind_text = S_ISDIR(st.st_mode) ? "directory" :
                            S_ISREG(st.st_mode) ? "file" :
                            S_ISLNK(st.st_mode) ? "symlink" : "other";
    napi_create_string_utf8(env, kind_text, NAPI_AUTO_LENGTH, &kind);
    napi_create_double(env, static_cast<double>(st.st_size), &size);
    napi_set_named_property(env, item, "name", name);
    napi_set_named_property(env, item, "kind", kind);
    napi_set_named_property(env, item, "size", size);
    napi_set_element(env, output, index++, item);
  }
  closedir(directory);
  close(fd);
  if (read_error != 0) return throw_errno(env, "read workspace directory", read_error);
  return output;
}

static napi_value create_exclusive(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_value self;
  napi_get_cb_info(env, info, &argc, args, &self, nullptr);
  SandboxRoot* root = nullptr;
  if (argc != 2 || !get_root(env, self, &root)) {
    napi_throw_type_error(env, "EINVAL", "Invalid secure workspace handle or arguments.");
    return nullptr;
  }
  std::string path;
  void* buffer_data = nullptr;
  size_t length = 0;
  bool is_buffer = false;
  if (!get_string(env, args[0], &path) || napi_is_buffer(env, args[1], &is_buffer) != napi_ok ||
      !is_buffer || napi_get_buffer_info(env, args[1], &buffer_data, &length) != napi_ok) {
    napi_throw_type_error(env, "EINVAL", "Secure exclusive creation requires a relative path and Buffer.");
    return nullptr;
  }
  std::vector<std::string> parts;
  if (!split_path(path, &parts, false)) {
    napi_throw_type_error(env, "EINVAL", "Secure file paths must be normalized and workspace-relative.");
    return nullptr;
  }
  int parent = -1;
  std::string basename, parent_path;
  if (!open_parent(root, path, true, &parent, &basename, &parent_path)) {
    return throw_errno(env, "open/create secure parent directory", errno);
  }
  std::string temp;
  if (!create_temp_file(parent, &temp, static_cast<const char*>(buffer_data), length)) {
    int saved = errno;
    close(parent);
    return throw_errno(env, "write exclusive staging file", saved);
  }
  if (!same_directory(root->fd, parent_path, parent)) {
    int saved = errno;
    unlinkat(parent, temp.c_str(), 0);
    close(parent);
    return throw_errno(env, "revalidate parent before exclusive publication", saved);
  }
  int result = static_cast<int>(syscall(SYS_renameat2, parent, temp.c_str(), parent,
                                        basename.c_str(), RENAME_NOREPLACE));
  if (result != 0) {
    int saved = errno;
    unlinkat(parent, temp.c_str(), 0);
    close(parent);
    return throw_errno(env, "publish exclusive workspace file", saved);
  }
  close(parent);
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

static napi_value write_atomic(napi_env env, napi_callback_info info) {
  size_t argc = 2;
  napi_value args[2];
  napi_value self;
  napi_get_cb_info(env, info, &argc, args, &self, nullptr);
  SandboxRoot* root = nullptr;
  if (argc != 2 || !get_root(env, self, &root)) {
    napi_throw_type_error(env, "EINVAL", "Invalid secure workspace handle or arguments.");
    return nullptr;
  }
  std::string path;
  void* buffer_data = nullptr;
  size_t length = 0;
  bool is_buffer = false;
  if (!get_string(env, args[0], &path) || napi_is_buffer(env, args[1], &is_buffer) != napi_ok ||
      !is_buffer || napi_get_buffer_info(env, args[1], &buffer_data, &length) != napi_ok) {
    napi_throw_type_error(env, "EINVAL", "Secure write requires a relative path and Buffer.");
    return nullptr;
  }
  std::vector<std::string> parts;
  if (!split_path(path, &parts, false)) {
    napi_throw_type_error(env, "EINVAL", "Secure file paths must be normalized and workspace-relative.");
    return nullptr;
  }
  int original = openat2_call(root->fd, path.c_str(), O_RDONLY | O_CLOEXEC, 0,
                              kResolveBeneath);
  if (original < 0) return throw_errno(env, "open existing workspace file", errno);
  struct stat original_stat = {};
  if (!stat_regular_single_link(original, &original_stat)) {
    int saved = errno;
    close(original);
    return throw_errno(env, "reject non-regular or multiply-linked file", saved);
  }
  close(original);

  int parent = -1;
  std::string basename, parent_path;
  if (!open_parent(root, path, false, &parent, &basename, &parent_path)) {
    return throw_errno(env, "open secure parent directory", errno);
  }
  std::string temp;
  if (!create_temp_file(parent, &temp, static_cast<const char*>(buffer_data), length)) {
    int saved = errno;
    close(parent);
    return throw_errno(env, "write secure staging file", saved);
  }

  int current = openat2_call(root->fd, path.c_str(), O_RDONLY | O_CLOEXEC, 0,
                             kResolveBeneath);
  struct stat current_stat = {};
  bool target_unchanged = current >= 0 && stat_regular_single_link(current, &current_stat) &&
                          current_stat.st_dev == original_stat.st_dev &&
                          current_stat.st_ino == original_stat.st_ino;
  int target_error = errno;
  if (current >= 0) close(current);
  if (!target_unchanged || !same_directory(root->fd, parent_path, parent)) {
    int saved = target_unchanged ? errno : (target_error == 0 ? EAGAIN : target_error);
    unlinkat(parent, temp.c_str(), 0);
    close(parent);
    return throw_errno(env, "revalidate target and parent before publication", saved);
  }
  int result = static_cast<int>(syscall(SYS_renameat2, parent, temp.c_str(), parent,
                                        basename.c_str(), 0));
  if (result != 0) {
    int saved = errno;
    unlinkat(parent, temp.c_str(), 0);
    close(parent);
    return throw_errno(env, "replace workspace file safely", saved);
  }
  close(parent);
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

static napi_value close_root(napi_env env, napi_callback_info info) {
  napi_value self;
  size_t argc = 0;
  napi_get_cb_info(env, info, &argc, nullptr, &self, nullptr);
  SandboxRoot* root = nullptr;
  if (napi_unwrap(env, self, reinterpret_cast<void**>(&root)) == napi_ok && root != nullptr && root->fd >= 0) {
    close(root->fd);
    root->fd = -1;
  }
  napi_value undefined;
  napi_get_undefined(env, &undefined);
  return undefined;
}

static napi_value get_supported(napi_env env, napi_callback_info) {
  int fd = openat2_call(AT_FDCWD, ".", O_PATH | O_DIRECTORY | O_CLOEXEC, 0, kResolveRoot);
  bool supported = fd >= 0;
  if (fd >= 0) close(fd);
  napi_value value;
  napi_get_boolean(env, supported, &value);
  return value;
}

static napi_value init(napi_env env, napi_value exports) {
  napi_property_descriptor methods[] = {
    {"readFile", nullptr, read_file, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"readDirectory", nullptr, read_directory, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"createExclusive", nullptr, create_exclusive, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"writeAtomic", nullptr, write_atomic, nullptr, nullptr, nullptr, napi_default, nullptr},
    {"close", nullptr, close_root, nullptr, nullptr, nullptr, napi_default, nullptr},
  };
  napi_value constructor;
  if (napi_define_class(env, "SandboxRoot", NAPI_AUTO_LENGTH, root_constructor, nullptr,
                        sizeof(methods) / sizeof(methods[0]), methods, &constructor) != napi_ok) {
    napi_throw_error(env, "EIO", "Could not define the secure filesystem boundary.");
    return nullptr;
  }
  napi_set_named_property(env, exports, "SandboxRoot", constructor);
  napi_value supported = get_supported(env, nullptr);
  napi_set_named_property(env, exports, "supported", supported);
  return exports;
}

NAPI_MODULE(NODE_GYP_MODULE_NAME, init)
