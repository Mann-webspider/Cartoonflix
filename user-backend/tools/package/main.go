// Build and package the Go user API as a deployable Lambda zip.
//
//	go run ./tools/package
//
// Go is the only tool required, deliberately. A Makefile would need `make` and
// a `zip` step would need `zip`, neither of which ships with Windows — and
// PowerShell's Compress-Archive is worse than missing, because it writes no
// Unix permission bits, so `bootstrap` arrives without the executable flag and
// the function dies at cold start with:
//
//	fork/exec /var/task/bootstrap: permission denied
package main

import (
	"archive/zip"
	"flag"
	"fmt"
	"io"
	"log"
	"os"
	"os/exec"
	"path/filepath"
)

func main() {
	arch := flag.String("arch", "amd64", "target architecture: amd64 or arm64")
	out := flag.String("out", "dist/lambda.zip", "zip to write")
	skipBuild := flag.Bool("skip-build", false, "package an existing dist/bootstrap")
	flag.Parse()

	binary := filepath.Join("dist", "bootstrap")

	if !*skipBuild {
		if err := build(binary, *arch); err != nil {
			log.Fatalf("build: %v", err)
		}
	}
	if err := archiveBinary(binary, *out); err != nil {
		log.Fatalf("package: %v", err)
	}
}

func build(binary, arch string) error {
	if err := os.MkdirAll(filepath.Dir(binary), 0o755); err != nil {
		return err
	}

	cmd := exec.Command("go", "build",
		// Drops the RPC server the runtime does not use, shrinking the binary.
		"-tags", "lambda.norpc",
		// Strip the symbol table and DWARF: nothing debugs a Lambda by attaching
		// to it, and this removes several megabytes of upload per deploy.
		"-ldflags", "-s -w",
		"-o", binary,
		"./cmd/lambda",
	)
	// Cross-compile from whatever the host is; Lambda runs Linux.
	cmd.Env = append(os.Environ(), "GOOS=linux", "GOARCH="+arch, "CGO_ENABLED=0")
	cmd.Stdout = os.Stdout
	cmd.Stderr = os.Stderr

	fmt.Printf("building linux/%s...\n", arch)
	return cmd.Run()
}

func archiveBinary(binary, out string) error {
	source, err := os.Open(binary)
	if err != nil {
		return fmt.Errorf("open %s: %w", binary, err)
	}
	defer source.Close()

	if err := os.MkdirAll(filepath.Dir(out), 0o755); err != nil {
		return err
	}
	archive, err := os.Create(out)
	if err != nil {
		return err
	}
	defer archive.Close()

	writer := zip.NewWriter(archive)

	header := &zip.FileHeader{
		// provided.al2023 looks for exactly this name at the archive root,
		// whatever the binary is called on disk.
		Name:   "bootstrap",
		Method: zip.Deflate,
	}
	// 0755 is the whole reason this tool exists: without the executable bit the
	// runtime cannot start the process.
	header.SetMode(0o755)

	entry, err := writer.CreateHeader(header)
	if err != nil {
		return err
	}
	if _, err := io.Copy(entry, source); err != nil {
		return err
	}
	if err := writer.Close(); err != nil {
		return err
	}

	info, err := os.Stat(out)
	if err != nil {
		return err
	}
	fmt.Printf("wrote %s (%.1f MB), bootstrap mode 0755\n", out, float64(info.Size())/(1<<20))
	return nil
}
