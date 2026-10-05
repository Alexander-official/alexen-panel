"""Keys and certificates for AmneziaWG and OpenVPN, made by the panel (the
agents never create any): WireGuard key pairs, an OpenVPN CA with a server
certificate per server and a client certificate per user, and the tls-crypt key."""
import base64
import datetime
import os
import secrets

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec, x25519
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID


def wg_keypair():
    priv = x25519.X25519PrivateKey.generate()
    raw = priv.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw, serialization.NoEncryption())
    pub = priv.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)
    return base64.b64encode(raw).decode(), base64.b64encode(pub).decode()


def wg_public(private_b64: str) -> str:
    priv = x25519.X25519PrivateKey.from_private_bytes(base64.b64decode(private_b64))
    return base64.b64encode(priv.public_key().public_bytes(serialization.Encoding.Raw, serialization.PublicFormat.Raw)).decode()


def wg_psk() -> str:
    return base64.b64encode(os.urandom(32)).decode()


def _pem_key(key) -> str:
    return key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                             serialization.NoEncryption()).decode()


def _pem_cert(cert) -> str:
    return cert.public_bytes(serialization.Encoding.PEM).decode()


def make_ca(name: str = "Alexen VPN CA"):
    key = ec.generate_private_key(ec.SECP256R1())
    subject = x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, name)])
    now = datetime.datetime.now(datetime.timezone.utc)
    cert = (x509.CertificateBuilder().subject_name(subject).issuer_name(subject)
            .public_key(key.public_key()).serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1)).not_valid_after(now + datetime.timedelta(days=3650 * 3))
            .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
            .add_extension(x509.KeyUsage(digital_signature=True, key_cert_sign=True, crl_sign=True,
                                         content_commitment=False, key_encipherment=False, data_encipherment=False,
                                         key_agreement=False, encipher_only=False, decipher_only=False), critical=True)
            .sign(key, hashes.SHA256()))
    return _pem_cert(cert), _pem_key(key)


def issue(ca_cert_pem: str, ca_key_pem: str, cn: str, server: bool):
    """a server or client certificate signed by the CA"""
    ca_cert = x509.load_pem_x509_certificate(ca_cert_pem.encode())
    ca_key = serialization.load_pem_private_key(ca_key_pem.encode(), None)
    key = ec.generate_private_key(ec.SECP256R1())
    now = datetime.datetime.now(datetime.timezone.utc)
    b = (x509.CertificateBuilder()
         .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, cn)]))
         .issuer_name(ca_cert.subject).public_key(key.public_key())
         .serial_number(x509.random_serial_number())
         .not_valid_before(now - datetime.timedelta(days=1)).not_valid_after(now + datetime.timedelta(days=3650 * 2))
         .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
         .add_extension(x509.KeyUsage(digital_signature=True, key_encipherment=False, key_agreement=True,
                                      content_commitment=False, data_encipherment=False, key_cert_sign=False,
                                      crl_sign=False, encipher_only=False, decipher_only=False), critical=True)
         .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH if server
                                               else ExtendedKeyUsageOID.CLIENT_AUTH]), critical=False))
    cert = b.sign(ca_key, hashes.SHA256())
    return _pem_cert(cert), _pem_key(key)


def tls_crypt_key() -> str:
    """an OpenVPN static key (2048 bits), the format --genkey writes"""
    h = secrets.token_hex(256)
    lines = [h[i:i + 32] for i in range(0, len(h), 32)]
    return "-----BEGIN OpenVPN Static key V1-----\n" + "\n".join(lines) + "\n-----END OpenVPN Static key V1-----\n"


def wg_device_key(private_b64: str, slot: int) -> str:
    """the private key of a user's device: slot 0 is the user's own key, the
    others are derived from it (so nothing extra has to be stored)"""
    if slot == 0:
        return private_b64
    from cryptography.hazmat.primitives.kdf.hkdf import HKDF
    raw = HKDF(algorithm=hashes.SHA256(), length=32, salt=None,
               info=f"alexen-awg-device-{slot}".encode()).derive(base64.b64decode(private_b64))
    key = x25519.X25519PrivateKey.from_private_bytes(raw)
    return base64.b64encode(key.private_bytes(serialization.Encoding.Raw, serialization.PrivateFormat.Raw,
                                              serialization.NoEncryption())).decode()
