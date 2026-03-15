#!/bin/sh
# APM installer — https://apm.orthg.nl
# Usage: curl -fsSL https://apm.orthg.nl/install.sh | sh
set -e

REPO="orthogonalhq/apm"
INSTALL_DIR="${APM_INSTALL_DIR:-$HOME/.apm/bin}"
BASE_URL="https://github.com/${REPO}/releases"

# Colors (only if terminal supports it)
if [ -t 1 ]; then
  BOLD='\033[1m'
  GREEN='\033[0;32m'
  RED='\033[0;31m'
  YELLOW='\033[0;33m'
  RESET='\033[0m'
else
  BOLD='' GREEN='' RED='' YELLOW='' RESET=''
fi

info()  { printf "${BOLD}${GREEN}info${RESET}  %s\n" "$1"; }
warn()  { printf "${BOLD}${YELLOW}warn${RESET}  %s\n" "$1"; }
error() { printf "${BOLD}${RED}error${RESET} %s\n" "$1" >&2; exit 1; }

# Detect OS
detect_os() {
  case "$(uname -s)" in
    Linux*)  echo "linux" ;;
    Darwin*) echo "darwin" ;;
    MINGW*|MSYS*|CYGWIN*) echo "windows" ;;
    *) error "Unsupported OS: $(uname -s)" ;;
  esac
}

# Detect architecture
detect_arch() {
  case "$(uname -m)" in
    x86_64|amd64)  echo "x86_64" ;;
    aarch64|arm64)  echo "aarch64" ;;
    *) error "Unsupported architecture: $(uname -m)" ;;
  esac
}

# Detect libc (glibc vs musl)
detect_libc() {
  if [ "$(detect_os)" != "linux" ]; then
    echo ""
    return
  fi

  if ldd --version 2>&1 | grep -qi musl; then
    echo "musl"
  else
    echo "gnu"
  fi
}

# Map to Rust target triple
get_target() {
  os="$1"
  arch="$2"
  libc="$3"

  case "${os}-${arch}" in
    linux-x86_64)
      if [ "$libc" = "musl" ]; then
        echo "x86_64-unknown-linux-musl"
      else
        echo "x86_64-unknown-linux-gnu"
      fi
      ;;
    linux-aarch64)   echo "aarch64-unknown-linux-gnu" ;;
    darwin-x86_64)   echo "x86_64-apple-darwin" ;;
    darwin-aarch64)  echo "aarch64-apple-darwin" ;;
    windows-x86_64)  echo "x86_64-pc-windows-msvc" ;;
    *) error "Unsupported platform: ${os}-${arch}" ;;
  esac
}

# Get latest version from GitHub
get_latest_version() {
  if command -v curl > /dev/null 2>&1; then
    curl -fsSL "${BASE_URL}/latest" -o /dev/null -w '%{url_effective}' 2>/dev/null | rev | cut -d'/' -f1 | rev
  elif command -v wget > /dev/null 2>&1; then
    wget -qO- --server-response "${BASE_URL}/latest" 2>&1 | grep "Location:" | tail -1 | rev | cut -d'/' -f1 | rev
  else
    error "Neither curl nor wget found. Please install one."
  fi
}

# Download a file
download() {
  url="$1"
  dest="$2"

  if command -v curl > /dev/null 2>&1; then
    curl -fsSL "$url" -o "$dest"
  elif command -v wget > /dev/null 2>&1; then
    wget -qO "$dest" "$url"
  fi
}

main() {
  os=$(detect_os)
  arch=$(detect_arch)
  libc=$(detect_libc)
  target=$(get_target "$os" "$arch" "$libc")

  info "Detected platform: ${target}"

  # Get version (allow override via APM_VERSION)
  if [ -n "$APM_VERSION" ]; then
    version="$APM_VERSION"
  else
    info "Fetching latest version..."
    version=$(get_latest_version)
    if [ -z "$version" ]; then
      error "Could not determine latest version. Set APM_VERSION manually."
    fi
  fi

  info "Installing APM ${version}..."

  # Determine archive extension
  if [ "$os" = "windows" ]; then
    ext="zip"
  else
    ext="tar.gz"
  fi

  archive_name="apm-${version}-${target}.${ext}"
  download_url="${BASE_URL}/download/${version}/${archive_name}"

  # Download to temp directory
  tmp_dir=$(mktemp -d)
  trap 'rm -rf "$tmp_dir"' EXIT

  info "Downloading ${download_url}..."
  download "$download_url" "${tmp_dir}/${archive_name}"

  # Extract
  info "Extracting..."
  if [ "$ext" = "tar.gz" ]; then
    tar xzf "${tmp_dir}/${archive_name}" -C "$tmp_dir"
  else
    unzip -q "${tmp_dir}/${archive_name}" -d "$tmp_dir"
  fi

  # Install binary
  mkdir -p "$INSTALL_DIR"

  if [ "$os" = "windows" ]; then
    mv "${tmp_dir}/apm.exe" "${INSTALL_DIR}/apm.exe"
  else
    mv "${tmp_dir}/apm" "${INSTALL_DIR}/apm"
    chmod +x "${INSTALL_DIR}/apm"
  fi

  info "Installed to ${INSTALL_DIR}/apm"

  # Check PATH
  case ":$PATH:" in
    *":${INSTALL_DIR}:"*) ;;
    *)
      warn "${INSTALL_DIR} is not in your PATH."
      echo ""
      echo "Add it by appending this to your shell config:"
      echo ""

      shell_name=$(basename "${SHELL:-/bin/sh}")
      case "$shell_name" in
        zsh)  config_file="~/.zshrc" ;;
        bash) config_file="~/.bashrc" ;;
        fish) config_file="~/.config/fish/config.fish" ;;
        *)    config_file="your shell config" ;;
      esac

      if [ "$shell_name" = "fish" ]; then
        echo "  fish_add_path ${INSTALL_DIR}"
      else
        echo "  export PATH=\"${INSTALL_DIR}:\$PATH\""
      fi
      echo ""
      echo "Then restart your shell or run: source ${config_file}"
      ;;
  esac

  echo ""
  info "APM ${version} installed successfully!"
  echo ""
  echo "  Get started:"
  echo "    apm search <query>       Search for agent skills"
  echo "    apm install @scope/name  Install a skill"
  echo "    apm info @scope/name     View skill details"
  echo ""
}

main "$@"
