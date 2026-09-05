#!/usr/bin/env python3
"""Update from the previous release in a private home: history, account, launcher, and links survive."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
previous = os.environ.get('TYPEARCHY_PREVIOUS_TAG', 'v1.3.0')
with tempfile.TemporaryDirectory(prefix='typearchy-update-test-') as directory:
    home = Path(directory)
    commands = home / 'commands'
    commands.mkdir()
    mime = commands / 'xdg-mime'
    mime.write_text('#!/usr/bin/env python3\nimport os, pathlib, sys\np=pathlib.Path(os.environ["XDG_CONFIG_HOME"])/"mimeapps.list"\nif sys.argv[1]=="default": p.write_text(sys.argv[2])\nelse: print(p.read_text() if p.exists() else "")\n')
    mime.chmod(0o755)
    env = {**os.environ, 'HOME': str(home), 'XDG_CONFIG_HOME': str(home / 'config'), 'XDG_DATA_HOME': str(home / 'data'), 'XDG_STATE_HOME': str(home / 'state'), 'PATH': str(commands) + ':' + os.environ['PATH'], 'QT_QPA_PLATFORM': 'offscreen', 'TYPEARCHY_QUIET': '1', 'QSG_RHI_BACKEND': 'software'}
    env.pop('TYPEARCHY_STATE_DIR', None)
    (home / 'config').mkdir()
    old_checkout = home / 'previous'
    old_checkout.mkdir()
    archive = subprocess.run(['git', '-C', str(root), 'archive', previous], check=True, capture_output=True)
    subprocess.run(['tar', '-x', '-C', str(old_checkout)], input=archive.stdout, check=True)
    old_version = json.loads((old_checkout / 'manifest.json').read_text())['version']
    subprocess.run([str(old_checkout / 'bin/typearchy-install')], env=env, check=True, capture_output=True)
    state = home / 'state/typearchy'
    (state / 'desktop').mkdir(parents=True, exist_ok=True)
    history = {'version': 6, 'runs': [{'timestamp': '2026-09-01T10:00:00Z', 'date': '2026-09-01', 'mode': 'sprint', 'wpm': 61, 'accuracy': 97, 'challengeKey': 'sprint:prose:30'}], 'totalTests': 7, 'bestWpm': 61}
    (state / 'desktop/stats.json').write_text(json.dumps(history))
    (state / 'profile.json').write_text('{"fixture":"preserve-account"}')
    launcher = home / '.local/bin/typearchy'
    current = home / 'data/typearchy/application/current'
    assert current.resolve().name.startswith('release-' + old_version), current.resolve().name
    update = subprocess.run([str(root / 'bin/typearchy-install')], env=env, capture_output=True, text=True)
    assert update.returncode == 0, update.stderr
    new_version = json.loads((root / 'manifest.json').read_text())['version']
    assert current.resolve().name.startswith('release-' + new_version), current.resolve().name
    assert launcher.is_symlink() and launcher.resolve() == (current / 'bin/typearchy').resolve()
    assert json.loads((state / 'desktop/stats.json').read_text()) == history, 'History must survive an update'
    assert (state / 'profile.json').read_text() == '{"fixture":"preserve-account"}', 'Account must survive an update'
    entry = (home / 'data/applications/dev.typearchy.App.desktop').read_text()
    assert 'MimeType=x-scheme-handler/typearchy;' in entry and 'StartupWMClass=dev.typearchy.App' in entry
    assert (home / 'config/mimeapps.list').read_text().strip() == 'dev.typearchy.App.desktop'
    helper = subprocess.run([str(current / 'bin/typearchy-cloud'), 'status'], env={**env, 'TYPEARCHY_API_URL': 'http://127.0.0.1:9', 'TYPEARCHY_STATE_DIR': str(home / 'state/empty')}, capture_output=True, text=True)
    assert helper.returncode == 0 and json.loads(helper.stdout)['status'] == 'disconnected', helper.stdout + helper.stderr
    unreachable = subprocess.run([str(current / 'bin/typearchy-cloud'), 'challenge', 'abcdefghijkl'], env={**env, 'TYPEARCHY_API_URL': 'http://127.0.0.1:9', 'TYPEARCHY_STATE_DIR': str(home / 'state/empty')}, capture_output=True, text=True)
    failure = json.loads((unreachable.stdout.strip() or unreachable.stderr.strip()).splitlines()[-1])
    assert unreachable.returncode != 0 and failure['status'] == 'unreachable', unreachable.stdout + unreachable.stderr
    releases = sorted(p.name for p in (home / 'data/typearchy/application').iterdir() if p.name.startswith('release-'))
    assert len(releases) == 2, releases
    qml = str((current / 'Desktop.qml').resolve())
    try:
        subprocess.run([str(launcher)], env=env, check=True, capture_output=True, timeout=20)
        status = subprocess.run(['quickshell', 'ipc', '--path', qml, 'call', 'typearchy', 'status'], env=env, check=True, capture_output=True, text=True).stdout
        assert json.loads(status)['opened']
        assert json.loads((state / 'desktop/stats.json').read_text())['bestWpm'] == 61
        subprocess.run(['quickshell', 'ipc', '--path', qml, 'call', 'typearchy', 'close'], env=env, check=True, capture_output=True)
    finally:
        subprocess.run(['quickshell', 'kill', '--path', qml], env=env, capture_output=True)
    print(f'Private-home update from {old_version} to {new_version}: launcher, registration, history, account, offline helper, and launch passed.')
