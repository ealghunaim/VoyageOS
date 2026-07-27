from api.me.router import merge


def test_merge_updates_only_provided_keys():
    old = {"dob": "1990-01-01", "nationality": "KW", "custom": "kept"}
    out = merge(old, {"gender": "male"})
    assert out == {"dob": "1990-01-01", "nationality": "KW", "custom": "kept", "gender": "male"}


def test_members_replace_wholesale():
    old = {"members": [{"name": "A"}]}
    out = merge(old, {"members": [{"name": "B", "relation": "child"}]})
    assert out["members"] == [{"name": "B", "relation": "child"}]


def test_none_and_absent_do_not_erase():
    assert merge({"dob": "1990-01-01"}, {}) == {"dob": "1990-01-01"}
