import os
import tempfile
import unittest

db_path = os.path.join(tempfile.gettempdir(), "aitinerary-test.db")
for suffix in ("", "-wal", "-shm", "-journal"):
    try:
        os.remove(db_path + suffix)
    except FileNotFoundError:
        pass
os.environ["DATABASE_URL"] = f"sqlite:///{db_path}"

from fastapi.testclient import TestClient

from backend.main import app
from backend.regions import get_stop_profile


class BackendApiTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.client = TestClient(app)

    def test_health(self):
        response = self.client.get("/health")
        self.assertEqual(response.status_code, 200)
        self.assertTrue(response.json().get("ok"))

    def test_maps_config(self):
        response = self.client.get("/maps/config")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("free_mode", payload)
        self.assertIn("map_provider", payload)

    def test_generate_trip_has_coordinates(self):
        response = self.client.post(
            "/trip/generate",
            json={
                "destination": "Cebu",
                "region": "cebu",
                "days": 2,
                "budget": 20000,
                "interests": ["beach", "food"],
                "pace": "balanced",
                "travelers": "solo",
                "month": "June",
            },
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["destination"], "Cebu")
        self.assertEqual(len(payload["days"]), 2)
        for day in payload["days"]:
            for stop in day["stops"]:
                self.assertIsNotNone(stop["latitude"])
                self.assertIsNotNone(stop["longitude"])
                self.assertGreaterEqual(stop["cost"], 0)

    def test_curated_stop_details(self):
        response = self.client.post(
            "/trip/generate",
            json={
                "destination": "Tokyo",
                "region": "tokyo",
                "days": 2,
                "budget": 60000,
                "interests": ["food", "culture"],
                "pace": "balanced",
                "travelers": "solo",
                "month": "June",
            },
        )
        self.assertEqual(response.status_code, 200)
        for day in response.json()["days"]:
            for stop in day["stops"]:
                self.assertIsNotNone(stop["hours"])
                self.assertIsNotNone(stop["insider_tip"])
                self.assertIsNotNone(stop["duration_minutes"])
                self.assertEqual(stop["currency"], "JPY")

    def test_tours_endpoint(self):
        response = self.client.get("/tours/singapore")
        self.assertEqual(response.status_code, 200)
        catalog = response.json()["tours"]
        self.assertGreater(len(catalog), 3)
        entry = catalog[0]
        for key in ("name", "fee", "currency", "hours", "description", "insider_tip"):
            self.assertIn(key, entry)

    def test_chat_tour_answer(self):
        response = self.client.post(
            "/chat",
            json={"message": "what are the hours for tsukiji outer market?"},
        )
        self.assertEqual(response.status_code, 200)
        reply = response.json()["reply"]
        self.assertIn("Tsukiji", reply)
        self.assertIn("Hours", reply)

    def test_chat_plan_returns_itinerary(self):
        response = self.client.post(
            "/chat/plan",
            json={"prompt": "3 days in Palawan for a couple, beach and food, June"},
        )
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertIn("itinerary", payload)
        self.assertEqual(payload["itinerary"]["region"], "Palawan")

    def test_region_snapshot(self):
        response = self.client.get("/regions/cebu/snapshot")
        self.assertEqual(response.status_code, 200)
        payload = response.json()
        self.assertEqual(payload["region"], "cebu")
        self.assertIn("highlights", payload)

    def test_stop_profile_coordinates(self):
        profile = get_stop_profile("manila", "Intramuros Walk")
        self.assertEqual(profile["area"], "Intramuros")
        self.assertIsNotNone(profile["latitude"])
        self.assertIsNotNone(profile["longitude"])

    def test_auth_signup_login_and_saved_trips(self):
        signup = self.client.post(
            "/auth/signup",
            json={"name": "Tester", "email": "tester@example.com", "password": "secret123"},
        )
        self.assertEqual(signup.status_code, 200)
        token = signup.json()["token"]

        duplicate = self.client.post(
            "/auth/signup",
            json={"name": "Tester", "email": "tester@example.com", "password": "secret123"},
        )
        self.assertEqual(duplicate.status_code, 409)

        login = self.client.post(
            "/auth/login",
            json={"email": "tester@example.com", "password": "secret123"},
        )
        self.assertEqual(login.status_code, 200)
        self.assertIn("token", login.json())

        unauthorized = self.client.get("/auth/me")
        self.assertEqual(unauthorized.status_code, 401)

        me = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(me.status_code, 200)
        self.assertEqual(me.json()["user"]["email"], "tester@example.com")

        trip_response = self.client.post(
            "/trip/generate",
            json={
                "destination": "Cebu",
                "region": "cebu",
                "days": 1,
                "budget": 10000,
                "interests": ["beach"],
                "pace": "balanced",
                "travelers": "solo",
                "month": "June",
            },
        )
        itinerary = trip_response.json()

        saved = self.client.post(
            "/trips/saved",
            json={"itinerary": itinerary},
            headers={"Authorization": f"Bearer {token}"},
        )
        self.assertEqual(saved.status_code, 200)
        saved_id = saved.json()["id"]

        listing = self.client.get("/trips/saved", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(listing.status_code, 200)
        self.assertEqual(len(listing.json()["trips"]), 1)

        deleted = self.client.delete(
            f"/trips/saved/{saved_id}", headers={"Authorization": f"Bearer {token}"}
        )
        self.assertEqual(deleted.status_code, 200)

        listing_after = self.client.get("/trips/saved", headers={"Authorization": f"Bearer {token}"})
        self.assertEqual(len(listing_after.json()["trips"]), 0)

    def test_auth_hardening(self):
        signup = self.client.post(
            "/auth/signup",
            json={"name": "Hardening", "email": "hardening@example.com", "password": "secret123"},
        )
        self.assertEqual(signup.status_code, 200)
        token = signup.json()["token"]
        verification_token = signup.json()["verification_token"]

        self.assertFalse(signup.json()["user"]["email_verified"])
        verify = self.client.post("/auth/verify-email", json={"token": verification_token})
        self.assertEqual(verify.status_code, 200)

        me = self.client.get("/auth/me", headers={"Authorization": f"Bearer {token}"})
        self.assertTrue(me.json()["user"]["email_verified"])

        refreshed = self.client.post("/auth/refresh", json={"token": token})
        self.assertEqual(refreshed.status_code, 200)
        new_token = refreshed.json()["token"]
        self.assertNotEqual(new_token, token)

        forgot = self.client.post("/auth/forgot-password", json={"email": "hardening@example.com"})
        self.assertEqual(forgot.status_code, 200)
        reset_token = forgot.json()["reset_token"]

        reset = self.client.post(
            "/auth/reset-password",
            json={"token": reset_token, "new_password": "newsecret123"},
        )
        self.assertEqual(reset.status_code, 200)

        old_login = self.client.post(
            "/auth/login", json={"email": "hardening@example.com", "password": "secret123"}
        )
        self.assertEqual(old_login.status_code, 401)

        new_login = self.client.post(
            "/auth/login", json={"email": "hardening@example.com", "password": "newsecret123"}
        )
        self.assertEqual(new_login.status_code, 200)


if __name__ == "__main__":
    unittest.main()