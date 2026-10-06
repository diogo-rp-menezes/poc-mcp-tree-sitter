// POC: Tauri apenas orquestra o engine Node (sidecar) e abre a UI servida por ele.
// Fluxo: porta livre + token aleatório -> spawn(node engine.mjs) -> espera /api/health
//        -> janela em http://127.0.0.1:PORT/#token=TOKEN (UI same-origin: sem CORS).
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::{
    io::{Read, Write},
    net::{TcpListener, TcpStream},
    process::{Child, Command, Stdio},
    sync::Mutex,
    time::{Duration, Instant},
};
use tauri::{Manager, RunEvent, WebviewUrl, WebviewWindowBuilder};

struct Engine(Mutex<Option<Child>>);

/// No Windows o Tauri devolve caminhos com prefixo verbatim `\\?\`, que o Node não resolve como script principal.
fn clean(p: std::path::PathBuf) -> std::path::PathBuf {
    let s = p.to_string_lossy().into_owned();
    match s.strip_prefix(r"\\?\") {
        Some(rest) => std::path::PathBuf::from(rest),
        None => p,
    }
}

fn free_port() -> u16 {
    TcpListener::bind("127.0.0.1:0").unwrap().local_addr().unwrap().port()
}

fn random_token() -> String {
    let mut b = [0u8; 24];
    getrandom::getrandom(&mut b).expect("rng");
    b.iter().map(|x| format!("{x:02x}")).collect()
}

fn wait_health(port: u16, timeout: Duration) -> bool {
    let start = Instant::now();
    while start.elapsed() < timeout {
        if let Ok(mut s) = TcpStream::connect_timeout(
            &format!("127.0.0.1:{port}").parse().unwrap(),
            Duration::from_millis(300),
        ) {
            let _ = s.write_all(b"GET /api/health HTTP/1.0\r\nHost: 127.0.0.1\r\n\r\n");
            let mut buf = String::new();
            let _ = s.read_to_string(&mut buf);
            if buf.contains(" 200 ") {
                return true;
            }
        }
        std::thread::sleep(Duration::from_millis(200));
    }
    false
}

fn main() {
    let app = tauri::Builder::default()
        .setup(|app| {
            let port = free_port();
            let token = random_token();

            let engine_dir = clean(app.path().resource_dir()?.join("engine-dist"));
            let data_dir = clean(app.path().app_data_dir()?);
            std::fs::create_dir_all(&data_dir)?;
            // POC: raiz de workspace fixa (env POC_WORKSPACE_ROOT ou HOME). Raízes dinâmicas = próxima etapa.
            let root = std::env::var("POC_WORKSPACE_ROOT")
                .unwrap_or_else(|_| app.path().home_dir().unwrap().to_string_lossy().into_owned());

            // Sidecar "node" (externalBin) fica ao lado do executável do app.
            let node = std::env::current_exe()?
                .parent()
                .unwrap()
                .join(format!("node{}", std::env::consts::EXE_SUFFIX));

            let mut cmd = Command::new(node);
            cmd.arg(engine_dir.join("engine.mjs"))
                .current_dir(&engine_dir) // o engine serve ./dist (UI) relativo ao cwd
                .env("NODE_ENV", "production")
                .env("HOST", "127.0.0.1")
                .env("PORT", port.to_string())
                .env("MCP_API_KEYS", &token)
                .env("MCP_ASSETS_DIR", &engine_dir)
                .env("MCP_WORKER_FILE", engine_dir.join("worker.mjs"))
                .env("MCP_DB_PATH", data_dir.join("workspace.db"))
                .env("MCP_ALLOWED_WORKSPACE_ROOTS", &root)
                .stdin(Stdio::null());
            #[cfg(windows)]
            {
                use std::os::windows::process::CommandExt;
                cmd.creation_flags(0x0800_0000); // CREATE_NO_WINDOW
            }
            let child = cmd.spawn().map_err(|e| format!("falha ao iniciar engine: {e}"))?;
            app.manage(Engine(Mutex::new(Some(child))));

            if !wait_health(port, Duration::from_secs(20)) {
                return Err("engine não respondeu em 20s".into());
            }
            let url = format!("http://127.0.0.1:{port}/#token={token}");
            WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse().unwrap()))
                .title("MCP Tree-sitter Studio")
                .inner_size(1400.0, 900.0)
                .build()?;
            Ok(())
        })
        .build(tauri::generate_context!())
        .expect("erro ao construir o app");

    app.run(|handle, event| {
        if let RunEvent::Exit = event {
            if let Some(state) = handle.try_state::<Engine>() {
                if let Some(mut c) = state.0.lock().unwrap().take() {
                    let _ = c.kill();
                }
            }
        }
    });
}
