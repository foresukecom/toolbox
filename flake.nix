{
  description = "開発の友 (toolbox) の開発環境";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
  };

  outputs = { self, nixpkgs }:
    let
      systems = [ "aarch64-darwin" "x86_64-darwin" "aarch64-linux" "x86_64-linux" ];
      forAllSystems = f: nixpkgs.lib.genAttrs systems (system: f nixpkgs.legacyPackages.${system});
    in
    {
      devShells = forAllSystems (pkgs: {
        default = pkgs.mkShell {
          packages = with pkgs; [
            # フロントエンド
            nodejs_24
            yarn-berry

            # Netlify Functions (Go)
            go
            gopls
            gotools # goimports
            golangci-lint
            delve

            # タスクランナー
            just
          ];

          shellHook = ''
            export GOPATH="$PWD/.direnv/go"
            export GOBIN="$GOPATH/bin"
            export PATH="$GOBIN:$PATH"
          '';
        };
      });
    };
}
