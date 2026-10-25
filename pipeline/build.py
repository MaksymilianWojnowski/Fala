"""Full pipeline: verbs, then sentences. Run from the repo root: python -m pipeline.build."""
import sys

from pipeline import build_sentences, build_verbs


def main() -> int:
    if build_verbs.main() != 0:
        return 1
    return build_sentences.main()


if __name__ == '__main__':
    sys.exit(main())
