"""Browser tests for Galaxy AI hosting a chat plugin, with a fixture plugin that speaks the host contract."""

import json
import os
import shutil
import time

from galaxy.util import galaxy_directory
from .framework import (
    selenium_test,
    SeleniumIntegrationTestCase,
)

FIXTURE = "chat_fixture"
FIXTURE_DIRECTORY = os.path.join(os.path.dirname(__file__), "galaxy_ai_chat", FIXTURE)
STAGED_FIXTURE = os.path.join(galaxy_directory(), "static", "plugins", "visualizations", FIXTURE)
CHAT = {
    "agent_type": FIXTURE,
    "messages": [{"query": "Which aligner?", "response": "HISAT2."}],
    "document": {"turns": 1},
}


def _create_chat(test):
    """Saves a plugin chat as the browser's user, and returns its id."""
    raw = test.execute_script(
        "const request = new XMLHttpRequest();"
        "request.open('POST', '/api/chat/exchanges', false);"
        "request.setRequestHeader('Content-Type', 'application/json');"
        "request.send(arguments[0]);"
        "return request.responseText;",
        json.dumps(CHAT),
    )
    return json.loads(raw)["id"]


def _stage_fixture():
    """Stages the fixture where Galaxy finds plugins and serves their files."""
    shutil.rmtree(STAGED_FIXTURE, ignore_errors=True)
    shutil.copytree(FIXTURE_DIRECTORY, STAGED_FIXTURE)


class TestGalaxyAIChatPlugin(SeleniumIntegrationTestCase):
    ensure_registered = True

    @classmethod
    def handle_galaxy_config_kwds(cls, config):
        super().handle_galaxy_config_kwds(config)
        _stage_fixture()
        config["ai_chat_plugin"] = FIXTURE

    @classmethod
    def tearDownClass(cls):
        super().tearDownClass()
        shutil.rmtree(STAGED_FIXTURE, ignore_errors=True)

    def _fixture(self):
        return self.execute_script(
            "const frame = document.getElementById('galaxy_ai_chat');"
            "return frame && frame.contentWindow.__fixture ? JSON.stringify(frame.contentWindow.__fixture) : null;"
        )

    def _wait_for_fixture(self, condition, message):
        state = None
        for _ in range(60):
            raw = self._fixture()
            state = json.loads(raw) if raw else None
            if state and condition(state):
                return state
            time.sleep(0.5)
        raise AssertionError(f"{message}; the fixture has {state}")

    def _route(self, path):
        """Moves Galaxy's router to `path` without reloading the page."""
        self.execute_script(
            "history.pushState({}, '', arguments[0]); window.dispatchEvent(new PopStateEvent('popstate'));", path
        )

    def _path(self):
        return self.execute_script("return window.location.pathname;")

    @selenium_test
    def test_hosts_the_configured_plugin_and_keeps_it_running(self):
        self.home()
        # Galaxy has no AI backend configured here, so the plugin alone offers the chat.
        self.components.galaxyai.activity.wait_for_and_click()
        state = self._wait_for_fixture(lambda s: s["connected"], "the plugin did not connect")
        assert state["config"] == {"view": "chat"}
        self.wait_for_selector_absent_or_hidden(".galaxyai-container")
        self.execute_script("document.getElementById('galaxy_ai_chat').contentWindow.__kept = 'kept';")

        self._route("/galaxyai/new?q=Count%20my%20reads")
        state = self._wait_for_fixture(lambda s: len(s["commands"]) == 1, "the question did not arrive")
        assert state["commands"] == [{"channel": "galaxy-ai", "type": "ask", "question": "Count my reads"}]

        chat_id = _create_chat(self)
        # The plugin reported unsaved changes; the user agrees to replace them.
        self.execute_script("window.confirm = () => true;")
        self._route(f"/galaxyai/{chat_id}")
        state = self._wait_for_fixture(lambda s: len(s["commands"]) == 2, "the chat did not open")
        assert state["commands"][1] == {"channel": "galaxy-ai", "type": "open", "exchange_id": chat_id}
        assert self._path() == f"/galaxyai/{chat_id}"

        self.wait_for_selector_visible("[title='Dock to side panel']").click()
        self.wait_for_selector_visible("#chat-panel")
        assert self._path() == "/"
        self.wait_for_selector_visible("[title='Dock to bottom panel']").click()
        self.wait_for_selector_visible(".chat-panel-body")
        assert self.execute_script("return document.querySelectorAll('#galaxy_ai_chat').length;") == 1
        kept = self.execute_script("return document.getElementById('galaxy_ai_chat').contentWindow.__kept;")
        assert kept == "kept", "the plugin's page reloaded"
        assert self._fixture() is not None


class TestGalaxyAIWithoutPlugin(SeleniumIntegrationTestCase):
    ensure_registered = True

    @selenium_test
    def test_native_chat_explains_a_chat_saved_by_a_plugin(self):
        self.home()
        older = _create_chat(self)
        # Newer chats push it out of the 50 the chat history lists.
        for _ in range(50):
            _create_chat(self)
        self.get(f"galaxyai/{older}")
        self.wait_for_selector_visible(".galaxyai-container")
        notice = self.wait_for_selector_visible(".galaxyai-footer .alert")
        assert "saved by another AI chat" in notice.text
        assert self.execute_script("return document.getElementById('galaxy_ai_chat');") is None
        assert self.execute_script("return document.querySelector('#chat-input').disabled;") is True
