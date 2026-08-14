"""Things that must never be true of a production build.

These assert on app/eas.json rather than on Python. That is deliberate: eas.json
decides what gets compiled into a binary that goes to real users, and it is a
committed file, so a change to it is reviewable — which is exactly the property
the purchase harness needed and the old app.json flag did not have.

There is no JS test runner in this project, and adding one to assert a single
JSON invariant would be a worse trade than reading the file here.
"""
import json
import pathlib

EAS = pathlib.Path(__file__).resolve().parents[2] / "app" / "eas.json"

#: Any of these reaching a production build ships a debug affordance to paying
#: customers. Add to this list rather than inventing a second mechanism.
DEV_ONLY_ENV = ("EXPO_PUBLIC_PURCHASE_HARNESS",)


def profiles() -> dict:
    return json.loads(EAS.read_text())["build"]


def test_production_defines_no_dev_only_env():
    """The whole safety argument.

    The purchase harness is gated on __DEV__ or EXPO_PUBLIC_PURCHASE_HARNESS.
    __DEV__ is false in every EAS binary, so the only way the harness reaches
    the App Store is if the production profile defines that variable. This test
    is what turns "we remembered" into "it cannot happen quietly".
    """
    env = profiles().get("production", {}).get("env", {})
    for key in DEV_ONLY_ENV:
        assert key not in env, (
            f"{key} is set on the production build profile. The purchase "
            f"harness would ship to real users. Remove it from eas.json."
        )


def test_development_profile_still_enables_the_harness():
    """The other direction. If this silently stopped being set, the harness
    would vanish from device builds and the next person would waste an
    afternoon rediscovering why — which is precisely what happened when it was
    gated on __DEV__ alone."""
    env = profiles().get("development", {}).get("env", {})
    assert env.get("EXPO_PUBLIC_PURCHASE_HARNESS") == "1"


def test_every_profile_that_enables_it_is_internal_only():
    """A profile that both enables the harness and distributes publicly would
    be the same leak by another route."""
    for name, prof in profiles().items():
        env = prof.get("env", {})
        if env.get("EXPO_PUBLIC_PURCHASE_HARNESS") == "1":
            dist = prof.get("distribution", "store")
            assert dist == "internal", (
                f"profile {name!r} enables the harness but distributes as "
                f"{dist!r}; it must be internal."
            )
