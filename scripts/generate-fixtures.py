"""Generates the SUNSET reference-estate fixtures.

Deterministic: a fixed seed, so the committed JSON is reproducible and the
numbers the UI shows are stable between runs. Everything it emits is synthetic
and is labelled as such in the documents themselves.
"""
import json, random, os, sys

random.seed(20260912)

OUT = sys.argv[1]

SYSTEMS = [
    # (name, group, criticality, hndl, agility, lifetime_years, effort_months, has_context)
    ("payments-gateway",      "payments",     "hva",      True,  "negotiated",       10, 14, True),
    ("customer-api",          "platform",     "high",     True,  "negotiated",        7, 9,  True),
    ("internal-pki",          "security",     "hva",      False, "hardcoded",        20, 22, True),
    ("hsm-bridge",            "security",     "hva",      False, "vendor-controlled",20, 30, True),
    ("document-archive",      "records",      "high",     True,  "configuration",    25, 11, True),
    ("vpn-concentrator",      "network",      "high",     True,  "vendor-controlled", 8, 18, True),
    ("firmware-updater",      "devices",      "high",     False, "hardcoded",        12, 26, True),
    ("message-broker",        "platform",     "moderate", True,  "configuration",     4, 7,  True),
    ("identity-provider",     "security",     "hva",      True,  "negotiated",       12, 12, True),
    ("backup-vault",          "records",      "high",     True,  "configuration",    30, 15, True),
    ("telemetry-pipeline",    "platform",     "low",      False, "negotiated",        1, 4,  True),
    ("mainframe-bridge",      "legacy",       "high",     True,  "vendor-controlled", 15, 36, False),
    ("mobile-sdk",            "product",      "moderate", True,  "hardcoded",         3, 16, True),
    ("partner-sftp",          "integration",  "moderate", True,  "configuration",     6, 8,  False),
    ("code-signing",          "release",      "hva",      False, "hardcoded",        10, 20, True),
    ("analytics-warehouse",   "data",         "moderate", True,  None,               None, 6, True),
    ("edge-cache",            "network",      "low",      False, "negotiated",        1, 3,  True),
    ("hr-portal",             "corporate",    "moderate", True,  None,               None, None, False),
    ("iot-gateway",           "devices",      "moderate", True,  "vendor-controlled", None, None, False),
    ("research-store",        "data",         "high",     True,  "configuration",    40, 10, True),
]

# (algorithm, primitive, functions, param, curve, oid)
ALGORITHMS = [
    ("RSA", "pke", ["encrypt", "decrypt"], "2048", None, "1.2.840.113549.1.1.1"),
    ("RSA", "pke", ["encrypt", "decrypt"], "4096", None, "1.2.840.113549.1.1.1"),
    ("RSA", "signature", ["sign", "verify"], "2048", None, "1.2.840.113549.1.1.11"),
    ("RSA", "signature", ["sign", "verify"], "3072", None, "1.2.840.113549.1.1.11"),
    ("ECDSA", "signature", ["sign", "verify"], None, "secp256r1", "1.2.840.10045.4.3.2"),
    ("ECDSA", "signature", ["sign", "verify"], None, "secp384r1", "1.2.840.10045.4.3.3"),
    ("ECDH", "key-agree", ["keygen", "key-agree"], None, "secp256r1", "1.3.132.1.12"),
    ("X25519", "key-agree", ["keygen", "key-agree"], None, None, "1.3.101.110"),
    ("Ed25519", "signature", ["sign", "verify"], None, None, "1.3.101.112"),
    ("DH", "key-agree", ["keygen", "key-agree"], "2048", None, "1.2.840.113549.1.3.1"),
    ("AES", "block-cipher", ["encrypt", "decrypt"], "256", None, "2.16.840.1.101.3.4.1.46"),
    ("AES", "block-cipher", ["encrypt", "decrypt"], "128", None, "2.16.840.1.101.3.4.1.6"),
    ("ChaCha20-Poly1305", "ae", ["encrypt", "decrypt"], "256", None, None),
    ("SHA-256", "hash", ["digest"], None, None, "2.16.840.1.101.3.4.2.1"),
    ("SHA-512", "hash", ["digest"], None, None, "2.16.840.1.101.3.4.2.3"),
    ("SHA-1", "hash", ["digest"], None, None, "1.3.14.3.2.26"),
    ("3DES", "block-cipher", ["encrypt", "decrypt"], "168", None, "1.2.840.113549.3.7"),
    ("ML-KEM-768", "kem", ["encapsulate", "decapsulate"], "768", None, None),
    ("ML-DSA-65", "signature", ["sign", "verify"], "65", None, None),
    ("HKDF", "kdf", ["key-derive"], None, None, None),
]

# Algorithms the parser will not resolve on purpose: these become UNKNOWN
# findings with an `unrecognized-algorithm` gap, which is a real condition in
# every CBOM anyone has ever generated.
OPAQUE = [
    ("vendor-kex-v2", "unknown vendor key exchange"),
    ("proprietary-sig-1", "vendor signature scheme"),
    ("crypto_impl_native", "unresolved native symbol"),
    ("OID.1.2.392.200011.61.1.1.1", "unmapped OID"),
]

# RSA with no declared purpose: genuinely unclassifiable, which is the other
# major UNKNOWN path.
AMBIGUOUS = [("RSA", None, [], "2048", None, "1.2.840.113549.1.1.1")]

SUITES_TLS12 = [
    "TLS_ECDHE_RSA_WITH_AES_128_GCM_SHA256",
    "TLS_ECDHE_ECDSA_WITH_AES_256_GCM_SHA384",
    "TLS_DHE_RSA_WITH_AES_256_CBC_SHA256",
    "TLS_RSA_WITH_AES_128_CBC_SHA",
    "TLS_RSA_WITH_3DES_EDE_CBC_SHA",
]
SUITES_TLS13 = [
    "TLS_AES_256_GCM_SHA384",
    "TLS_CHACHA20_POLY1305_SHA256",
]

LANG_PATH = {
    "payments": ("services/payments-gateway/tls/handshake.go", 118),
    "platform": ("services/platform/crypto/provider.java", 402),
    "security": ("infra/security/pki/issuer.rs", 76),
    "records":  ("services/records/archive/seal.py", 231),
    "network":  ("infra/network/ipsec/profile.conf", 44),
    "devices":  ("firmware/devices/update/verify.c", 903),
    "legacy":   ("legacy/bridge/jcl/CRYPTMOD.cbl", 1204),
    "product":  ("mobile/sdk/src/pinning.kt", 57),
    "integration": ("integrations/partner-sftp/keys.yaml", 12),
    "release":  ("release/signing/notary.ts", 88),
    "data":     ("data/warehouse/encrypt_at_rest.sql", 19),
    "corporate": ("corporate/portal/web.config", 205),
}

components = []
contexts = []
ref_n = 0


def new_ref(prefix):
    global ref_n
    ref_n += 1
    return f"crypto/{prefix}/{ref_n:03d}"


def occurrence(group, offset):
    path, line = LANG_PATH.get(group, ("src/crypto/init.go", 10))
    return {"location": path, "line": line + offset}


for idx, (sysname, group, crit, hndl, agility, lifetime, effort, has_ctx) in enumerate(SYSTEMS):
    # Each system carries between 3 and 7 algorithm components.
    n_alg = random.randint(3, 7)
    picks = random.sample(ALGORITHMS, n_alg)
    for j, (alg, primitive, fns, param, curve, oid) in enumerate(picks):
        ref = new_ref("algorithm")
        props = {
            "primitive": primitive,
            "cryptoFunctions": fns,
            "executionEnvironment": random.choice(
                ["software-plain-ram", "hardware", "software-encrypted-ram"]
            ),
            "implementationPlatform": random.choice(["x86_64", "arm64", "generic"]),
        }
        if param:
            props["parameterSetIdentifier"] = param
        if curve:
            props["curve"] = curve
        comp = {
            "type": "cryptographic-asset",
            "bom-ref": ref,
            "name": alg,
            "group": sysname,
            "cryptoProperties": {
                "assetType": "algorithm",
                "algorithmProperties": props,
            },
            "evidence": {"occurrences": [occurrence(group, j * 17)]},
        }
        if oid:
            comp["cryptoProperties"]["oid"] = oid
        components.append(comp)

    # One TLS protocol component per system that terminates traffic.
    if group in ("payments", "platform", "network", "integration", "product", "corporate", "data"):
        ref = new_ref("protocol")
        version = random.choice(["1.2", "1.3", "1.2"])
        suites = SUITES_TLS13 if version == "1.3" else random.sample(SUITES_TLS12, 3)
        components.append(
            {
                "type": "cryptographic-asset",
                "bom-ref": ref,
                "name": f"{sysname} TLS endpoint",
                "group": sysname,
                "cryptoProperties": {
                    "assetType": "protocol",
                    "protocolProperties": {
                        "type": "tls",
                        "version": version,
                        "cipherSuites": [
                            {"name": s, "identifiers": ["0x%04X" % random.randint(0x0000, 0xFFFF)]}
                            for s in suites
                        ],
                    },
                },
                "evidence": {"occurrences": [occurrence(group, 3)]},
            }
        )

    if has_ctx:
        entry = {"selector": sysname, "owner": f"{group} engineering"}
        if lifetime is not None:
            entry["dataSecrecyLifetimeYears"] = lifetime
        if effort is not None:
            entry["migrationEffortMonths"] = effort
        if agility:
            entry["agility"] = agility
        entry["systemCriticality"] = crit
        entry["hndlExposed"] = hndl
        contexts.append(entry)

# Certificates from the internal PKI.
CERT_SUBJECTS = [
    ("CN=payments-gateway.synth.internal", "RSA", "2048"),
    ("CN=customer-api.synth.internal", "ECDSA", None),
    ("CN=identity-provider.synth.internal", "RSA", "4096"),
    ("CN=Synth Estate Issuing CA G2", "RSA", "4096"),
    ("CN=Synth Estate Root CA", "RSA", "4096"),
    ("CN=code-signing.synth.internal", "RSA", "3072"),
    ("CN=partner-sftp.synth.internal", "ECDSA", None),
    ("CN=mainframe-bridge.synth.internal", "RSA", "2048"),
    ("CN=vpn-concentrator.synth.internal", "RSA", "2048"),
    ("CN=iot-gateway.synth.internal", "ECDSA", None),
    ("CN=telemetry-pipeline.synth.internal", "Ed25519", None),
    ("CN=edge-cache.synth.internal", "ECDSA", None),
]
for i, (subject, alg, param) in enumerate(CERT_SUBJECTS):
    alg_ref = new_ref("algorithm")
    props = {"primitive": "signature", "cryptoFunctions": ["sign", "verify"]}
    if param:
        props["parameterSetIdentifier"] = param
    if alg == "ECDSA":
        props["curve"] = "secp384r1" if i % 2 else "secp256r1"
    components.append(
        {
            "type": "cryptographic-asset",
            "bom-ref": alg_ref,
            "name": alg,
            "group": subject.split("=")[1].split(".")[0],
            "cryptoProperties": {"assetType": "algorithm", "algorithmProperties": props},
        }
    )
    cert_ref = new_ref("certificate")
    components.append(
        {
            "type": "cryptographic-asset",
            "bom-ref": cert_ref,
            "name": subject,
            "cryptoProperties": {
                "assetType": "certificate",
                "certificateProperties": {
                    "subjectName": subject,
                    "issuerName": "CN=Synth Estate Issuing CA G2"
                    if "Root" not in subject and "Issuing" not in subject
                    else "CN=Synth Estate Root CA",
                    "notValidBefore": "2025-04-02T00:00:00Z",
                    "notValidAfter": f"202{7 + (i % 3)}-04-02T00:00:00Z",
                    "signatureAlgorithmRef": alg_ref,
                    "certificateFormat": "X.509",
                    "serialNumber": "%032x" % random.getrandbits(128),
                },
            },
        }
    )

# The unresolvable tail.
for i, (opaque, note) in enumerate(OPAQUE):
    sysname = SYSTEMS[(i * 5) % len(SYSTEMS)][0]
    group = SYSTEMS[(i * 5) % len(SYSTEMS)][1]
    components.append(
        {
            "type": "cryptographic-asset",
            "bom-ref": new_ref("algorithm"),
            "name": opaque,
            "group": sysname,
            "cryptoProperties": {
                "assetType": "algorithm",
                "algorithmProperties": {"cryptoFunctions": []},
            },
            "evidence": {"occurrences": [occurrence(group, 40 + i)]},
        }
    )

for i in range(6):
    sysname, group = SYSTEMS[(i * 3 + 1) % len(SYSTEMS)][0], SYSTEMS[(i * 3 + 1) % len(SYSTEMS)][1]
    components.append(
        {
            "type": "cryptographic-asset",
            "bom-ref": new_ref("algorithm"),
            "name": "RSA",
            "group": sysname,
            "cryptoProperties": {
                "assetType": "algorithm",
                "algorithmProperties": {"parameterSetIdentifier": "2048"},
                "oid": "1.2.840.113549.1.1.1",
            },
            "evidence": {"occurrences": [occurrence(group, 60 + i)]},
        }
    )

# A related-crypto-material component and a protocol with no cipher suites:
# both exercise parser branches that produce warnings rather than findings.
components.append(
    {
        "type": "cryptographic-asset",
        "bom-ref": new_ref("material"),
        "name": "payments-gateway signing key",
        "cryptoProperties": {
            "assetType": "related-crypto-material",
            "relatedCryptoMaterialProperties": {"type": "private-key", "state": "active"},
        },
    }
)
components.append(
    {
        "type": "cryptographic-asset",
        "bom-ref": new_ref("protocol"),
        "name": "mainframe-bridge SNA session",
        "group": "mainframe-bridge",
        "cryptoProperties": {"assetType": "protocol", "protocolProperties": {"type": "other"}},
    }
)

cbom = {
    "bomFormat": "CycloneDX",
    "specVersion": "1.6",
    "serialNumber": "urn:uuid:5f0d5b9c-3a44-4d21-9b7e-0c1f2a6e8d10",
    "version": 1,
    "metadata": {
        "timestamp": "2026-09-08T06:12:40Z",
        "tools": {"components": [{"type": "application", "name": "synthetic-cbom-generator", "version": "1.0.0"}]},
        "component": {
            "type": "application",
            "name": "SYNTHETIC reference estate",
            "version": "2026.09",
            "description": "Synthetic cryptographic inventory authored for SUNSET development. Not a real estate, not a real scan, not a real result.",
        },
        "properties": [
            {"name": "sunset:synthetic", "value": "true"},
            {
                "name": "sunset:provenance",
                "value": "Generated by scripts/generate-fixtures.py for interface development. Contains no real systems, hosts, keys or organisations.",
            },
        ],
    },
    "components": components,
}

context_doc = {
    "sunsetFormat": "context",
    "version": "1",
    "description": "Operator-supplied facts that automated discovery cannot collect: data-secrecy lifetime, migration effort, agility, criticality. SYNTHETIC - authored for SUNSET development.",
    "synthetic": True,
    "assets": contexts,
}

os.makedirs(OUT, exist_ok=True)
with open(os.path.join(OUT, "reference-estate.cbom.json"), "w", encoding="utf-8") as f:
    json.dump(cbom, f, indent=2)
    f.write("\n")
with open(os.path.join(OUT, "reference-estate.context.json"), "w", encoding="utf-8") as f:
    json.dump(context_doc, f, indent=2)
    f.write("\n")

print("components:", len(components), "contexts:", len(contexts))
