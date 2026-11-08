"""Contract tests for team_radar without network access or GitHub writes."""
import importlib.util
import json
import os
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch
from urllib.error import HTTPError

SCRIPT = Path(__file__).resolve().parents[1] / "scripts" / "team_radar.py"

def load_module():
    spec = importlib.util.spec_from_file_location("team_radar", SCRIPT)
    module = importlib.util.module_from_spec(spec)
    with patch.dict(os.environ, {"GITHUB_TOKEN": "test-token", "GITHUB_REPOSITORY": "BM000001/Alfred"}):
        spec.loader.exec_module(module)
    return module

class RadarContractTests(unittest.TestCase):
    def setUp(self):
        self.radar = load_module()

    def test_design_posts_expected_issue_and_navigation(self):
        with tempfile.TemporaryDirectory() as temp:
            root = Path(temp)
            (root / "src/app").mkdir(parents=True)
            (root / "src/app/App.tsx").write_text(
                "const sections = [{ id: 'inicio', label: 'Início', icon: 'home' }];\n"
                "const mobilePrimary: SectionId[] = ['inicio'];\n"
                "const mobileMore: SectionId[] = ['estudos'];\n", encoding="utf-8")
            with patch("os.getcwd", return_value=temp), patch.object(self.radar, "comment") as comment:
                original = os.getcwd()
                os.chdir(temp)
                try:
                    self.radar.design()
                finally:
                    os.chdir(original)
            comment.assert_called_once()
            issue, body = comment.call_args.args
            self.assertEqual(issue, 109)
            self.assertIn("Início", body)
            self.assertIn("estudos", body)

    def test_radar_posts_candidates_to_research_issue(self):
        sample = {"items": [{"full_name": "example/library", "html_url": "https://github.com/example/library",
                             "license": {"spdx_id": "MIT"}, "updated_at": "2026-11-01T00:00:00Z",
                             "stargazers_count": 42}]}
        with patch.object(self.radar, "api", return_value=sample) as api, patch.object(self.radar, "comment") as comment:
            self.radar.radar()
        self.assertEqual(api.call_count, 4)
        issue, body = comment.call_args.args
        self.assertEqual(issue, 110)
        self.assertIn("example/library", body)
        self.assertIn("MIT", body)
        self.assertIn("candidatos, não recomendações validadas", body)

    def test_search_failure_is_reported_and_other_queries_continue(self):
        with patch.object(self.radar, "api", side_effect=HTTPError("url", 403, "rate limited", {}, None)) as api, patch.object(self.radar, "comment") as comment:
            self.radar.radar()
        self.assertEqual(api.call_count, 4)
        self.assertEqual(comment.call_args.args[0], 110)
        self.assertIn("consulta indisponível", comment.call_args.args[1])

if __name__ == "__main__":
    unittest.main()
