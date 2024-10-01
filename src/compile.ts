// Used as the build script for all jsx files

// Returns the path of the compiled file
const build_jsx_file = async (file_path: string) => {
    const file_name = file_path.match("\/[^\/]+$")?.[0].slice(1);
    const compiled_name = `${file_name?.match("[^\.]+\.")?.[0]}js`
    // TODO: return with error if compilation fails
    const output = Bun.build({
        entrypoints: [file_path],
        target: "browser"
    });
    await Bun.write(`./static/out/${compiled_name}`, (await output).outputs)
    return compiled_name;
};

// Build all jsx files if told through env
if (Bun.env.BUILD_JSX === "true") {
    await build_jsx_file("./static/index.jsx");
}

export {build_jsx_file};