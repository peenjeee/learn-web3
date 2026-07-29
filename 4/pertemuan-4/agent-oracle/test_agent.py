import unittest

from judge import normalize_url, parse_verdict


class JudgeTest(unittest.TestCase):
    def test_normalize_github_blob_url(self):
        self.assertEqual(
            normalize_url("https://github.com/org/repo/blob/main/RULES.md"),
            "https://raw.githubusercontent.com/org/repo/main/RULES.md",
        )

    def test_parse_verdict(self):
        self.assertEqual(
            parse_verdict('{"eligible": true, "reason": "sesuai"}'),
            (True, "sesuai"),
        )


if __name__ == "__main__":
    unittest.main()
