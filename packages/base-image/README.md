## Building and publishing the image

### Build the image:

```
docker build -t swanky-base .
```

### Tag it with swanky version used, and it's own version:

```
docker tag [IMAGE_NAME] ghcr.io/astarnetwork/swanky-cli/swanky-base:swanky[X.X.X]_v[X.X.X]
```

Example:

```
docker tag swanky-base ghcr.io/astarnetwork/swanky-cli/swanky-base:swanky2.2.2_v1.1.4
```

### Push to repo:

Use the same tag created in the previous step

```
docker push ghcr.io/astarnetwork/swanky-cli/swanky-base:swanky2.2.3_v1.1.4
```
