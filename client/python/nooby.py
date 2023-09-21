#
#   _   _  ____   ____  ______     __
#  | \ | |/ __ \ / __ \|  _ \ \   / /
#  |  \| | |  | | |  | | |_) \ \_/ /
#  | . ` | |  | | |  | |  _ < \   /
#  | |\  | |__| | |__| | |_) | | |
#  |_| \_|\____/ \____/|____/  |_|
#
# @usage
# let noobyClient = new nooby
#
# @authors
# Luke100000
# Thecoolpeople
#
# @license MIT
#

import multiprocessing
import socket
import struct

import lz4.block
import msgpack


def compress(data):
    return lz4.block.compress(data.encode())


def decompress(compressed_data):
    return lz4.block.decompress(compressed_data).decode()


class NoobyClient:
    def __init__(self, wrapper, ip, port, compression=True):
        self.status = {"channel": "", "user": -1, "bytesSend": 0, "bytesReceived": 0}
        self.buffer_socket = bytearray()
        self.buffer_user = {}
        self.lock = multiprocessing.Lock()

        self.wrapper = wrapper
        self.ip = ip
        self.port = port
        self.compression = compression

        self.socket = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        self.socket.connect((ip, port))

        print("[nooby] TCP Socket is open now.")

        self.receive_process = multiprocessing.Process(target=self.receive_messages)
        self.receive_process.start()

    def shutdown(self):
        # TODO check if there are some send in buffer
        self.receive_process.kill()
        self.socket.close()

    def receive_messages(self):
        while True:
            try:
                data = self.socket.recv(256 * 256 + 4)
                if not data:
                    break
                self.handle_message(data)
            except IndexError:
                pass
        self.socket.close()

    def handle_message(self, data):
        self.lock.acquire()
        self.buffer_socket.extend(data)

        while len(self.buffer_socket) >= 4:
            chunk_size = struct.unpack(">H", self.buffer_socket[2:4])[0]
            if len(self.buffer_socket) >= chunk_size + 4:
                user_id = struct.unpack(">H", self.buffer_socket[0:2])[0]
                if user_id not in self.buffer_user:
                    self.buffer_user[user_id] = self.buffer_socket[
                        4 : chunk_size + 4 + 1
                    ]
                else:
                    self.buffer_user[user_id].extend(
                        self.buffer_socket[4 : chunk_size + 4 + 1]
                    )
                self.buffer_socket = self.buffer_socket[chunk_size + 4 + 1 :]

                while len(self.buffer_user[user_id]) >= 6:
                    header_size = struct.unpack(">H", self.buffer_user[user_id][0:2])[0]
                    payload_size = struct.unpack(">I", self.buffer_user[user_id][2:6])[
                        0
                    ]

                    if len(self.buffer_user[user_id]) >= 6 + header_size + payload_size:
                        header = self.buffer_user[user_id][6 : 6 + header_size]
                        payload = self.buffer_user[user_id][
                            6 + header_size : 6 + header_size + payload_size
                        ]

                        self.buffer_user[user_id] = self.buffer_user[user_id][
                            6 + header_size + payload_size + 1 :
                        ]

                        if header:
                            header = msgpack.unpackb(header)
                        else:
                            header = {"m": "message"}

                        if payload[0] == 0:
                            payload = msgpack.unpackb(payload[1:])
                        elif payload[0] == 1:
                            payload = decompress(payload[1:])
                            payload = msgpack.unpackb(payload)
                        elif payload[0] == 2:
                            # TODO: Handle zlib compressed payload
                            pass
                        elif payload[0] == 3:
                            # TODO: Handle gzip compressed payload
                            pass

                        header["u"] = user_id
                        self.wrapper["onmessage"](header, payload)

        self.lock.release()

    def send_message(self, data):
        self.socket.send(data)

    def send(self, header, payload):
        data = self.message_to_packet(header, payload)
        self.send_message(data)

    def connect(self, channel=None):
        if channel is not None:
            self.send({"m": "connect", "channel": channel}, {})
        else:
            self.send({"m": "connect"}, {})

    @staticmethod
    def int_to_2_bytes(n):
        return struct.pack(">H", n)

    @staticmethod
    def bytes_to_int(b):
        return struct.unpack(">I", b)[0]

    @staticmethod
    def int_to_4_bytes(n):
        return struct.pack(">I", n)

    def message_to_packet(self, header, payload):
        header_data = msgpack.packb(header)
        payload_data = msgpack.packb(payload)

        if self.compression and len(payload_data) >= 128:
            payload_data = bytes([1]) + compress(payload_data)
        else:
            payload_data = bytes([0]) + payload_data

        return (
            self.int_to_2_bytes(len(header_data))
            + self.int_to_4_bytes(len(payload_data))
            + header_data
            + payload_data
        )
