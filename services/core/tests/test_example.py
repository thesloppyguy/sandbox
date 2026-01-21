"""Tests for example endpoints."""

from fastapi.testclient import TestClient


def test_create_example(client: TestClient) -> None:
    """Test creating an example.

    Args:
        client: Test client
    """
    response = client.post(
        "/api/v1/examples",
        json={"name": "Test Example", "description": "A test example"},
    )
    assert response.status_code == 201
    data = response.json()
    assert data["name"] == "Test Example"
    assert data["description"] == "A test example"
    assert "id" in data
    assert "created_at" in data


def test_list_examples(client: TestClient) -> None:
    """Test listing examples.

    Args:
        client: Test client
    """
    # Create an example first
    client.post(
        "/api/v1/examples",
        json={"name": "Test Example", "description": "A test example"},
    )

    response = client.get("/api/v1/examples")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0


def test_get_example(client: TestClient) -> None:
    """Test getting an example by ID.

    Args:
        client: Test client
    """
    # Create an example first
    create_response = client.post(
        "/api/v1/examples",
        json={"name": "Test Example", "description": "A test example"},
    )
    example_id = create_response.json()["id"]

    response = client.get(f"/api/v1/examples/{example_id}")
    assert response.status_code == 200
    data = response.json()
    assert data["id"] == example_id
    assert data["name"] == "Test Example"


def test_get_example_not_found(client: TestClient) -> None:
    """Test getting a non-existent example.

    Args:
        client: Test client
    """
    response = client.get("/api/v1/examples/99999")
    assert response.status_code == 404


def test_update_example(client: TestClient) -> None:
    """Test updating an example.

    Args:
        client: Test client
    """
    # Create an example first
    create_response = client.post(
        "/api/v1/examples",
        json={"name": "Test Example", "description": "A test example"},
    )
    example_id = create_response.json()["id"]

    response = client.patch(
        f"/api/v1/examples/{example_id}",
        json={"name": "Updated Example"},
    )
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Updated Example"


def test_delete_example(client: TestClient) -> None:
    """Test deleting an example.

    Args:
        client: Test client
    """
    # Create an example first
    create_response = client.post(
        "/api/v1/examples",
        json={"name": "Test Example", "description": "A test example"},
    )
    example_id = create_response.json()["id"]

    response = client.delete(f"/api/v1/examples/{example_id}")
    assert response.status_code == 204

    # Verify it's deleted
    get_response = client.get(f"/api/v1/examples/{example_id}")
    assert get_response.status_code == 404
