# Seed data for Philippines destinations

This directory holds the first lightweight seed dataset for the Philippines-first MVP.

## Purpose
- Support future attraction and area metadata
- Keep the planner realistic for Cebu, Manila, and Palawan
- Provide a simple JSON structure for local data expansion

## Suggested next use
- Load these records via a future `backend/data_loader.py`
- Merge with live Google Maps / Places API metadata
- Add `coordinates`, `place_id`, and `photo_reference` once real map integration is active
