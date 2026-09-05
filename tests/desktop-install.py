#!/usr/bin/env python3
"""Verify installation, migration and launch in a private home without desktop changes."""
import json
import os
from pathlib import Path
import subprocess
import tempfile

root = Path(__file__).resolve().parent.parent
with tempfile.TemporaryDirectory(prefix='typearchy-desktop-test-') as directory:
    home = Path(directory)
    commands = home / 'commands'
    commands.mkdir()
    mime = commands / 'xdg-mime'
    mime.write_text('#!/usr/bin/env python3\nimport os, pathlib, sys\np=pathlib.Path(os.environ["XDG_CONFIG_HOME"])/"mimeapps.list"\nif sys.argv[1]=="default": p.write_text(sys.argv[2])\nelse: print(p.read_text() if p.exists() else "")\n')
    mime.chmod(0o755)
    env = {**os.environ, 'HOME': str(home), 'XDG_CONFIG_HOME': str(home / 'config'), 'XDG_DATA_HOME': str(home / 'data'), 'XDG_STATE_HOME': str(home / 'state'), 'PATH': str(commands) + ':' + os.environ['PATH'], 'QT_QPA_PLATFORM': 'offscreen', 'TYPEARCHY_QUIET': '1', 'QSG_RHI_BACKEND': 'software'}
    env.pop('TYPEARCHY_STATE_DIR', None)
    (home / 'config').mkdir()
    state = home / 'state/typearchy'
    state.mkdir(parents=True)
    legacy = {'version': 6, 'runs': [], 'totalTests': 3, 'bestWpm': 42}
    (state / 'stats.json').write_text(json.dumps(legacy))
    (state / 'profile.json').write_text('{"fixture":"preserve-account"}')
    launcher = home / '.local/bin/typearchy'
    launcher.parent.mkdir(parents=True)
    launcher.write_text('unrelated')
    blocked = subprocess.run([str(root / 'bin/typearchy-install')], env=env, capture_output=True, text=True)
    assert blocked.returncode != 0 and launcher.read_text() == 'unrelated'
    assert not (home / 'data/typearchy').exists()
    launcher.unlink()
    applications = home / 'data/applications'
    applications.mkdir(parents=True)
    retired = applications / 'typearchy-challenge.desktop'
    retired.write_text('[Desktop Entry]\nExec=/old/typearchy-open %u\n')
    subprocess.run([str(root / 'bin/typearchy-install')], env=env, check=True, capture_output=True)
    assert not retired.exists(), 'Retired plugin handler must not appear in app choosers'
    entry = (applications / 'dev.typearchy.App.desktop').read_text()
    assert 'Icon=' + str(home / 'data/icons/hicolor/scalable/apps/dev.typearchy.App.svg') in entry
    qml = str((home / 'data/typearchy/application/current/Desktop.qml').resolve())
    try:
        subprocess.run([str(launcher)], env=env, check=True, capture_output=True, timeout=20)
        def ipc(*args):
            return subprocess.run(['quickshell', 'ipc', '--path', qml, 'call', 'typearchy', *args], env=env, check=True, capture_output=True, text=True).stdout
        assert json.loads(ipc('status'))['opened']
        assert json.loads((state / 'desktop/stats.json').read_text())['bestWpm'] == 42
        assert json.loads((state / 'desktop/legacy-stats-backup.json').read_text()) == legacy
        assert json.loads((state / 'stats.json').read_text()) == legacy
        assert (state / 'profile.json').read_text() == '{"fixture":"preserve-account"}'
        subprocess.run([str(launcher), '--history'], env=env, check=True, capture_output=True)
        update = subprocess.run([str(root / 'bin/typearchy-install')], env=env, capture_output=True, text=True)
        assert update.returncode != 0 and 'Close the running' in update.stderr
        invalid = subprocess.run([str(launcher), 'typearchy://challenge/invalid'], env=env, capture_output=True)
        assert invalid.returncode != 0
        ipc('close')
    finally:
        subprocess.run(['quickshell', 'kill', '--path', qml], env=env, capture_output=True)
    print('Private-home installation: unrelated launcher protection, registration, launch, history/account preservation, single instance, active update protection, invalid link rejection passed.')
