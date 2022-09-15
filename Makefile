PY = python3
VENV = .venv
BIN = $(VENV)/bin
CCF_DIR = cloak-tee/CCF

install:
	$(PY) -m venv $(VENV)
	$(BIN)/pip install --disable-pip-version-check -q -U -e $(CCF_DIR)/python/
	$(BIN)/pip install  -r $(CCF_DIR)/../agent/requirements.txt 
	$(BIN)/pip install  -r $(CCF_DIR)/python/requirements.txt 
	$(BIN)/pip install  -r $(CCF_DIR)/tests/requirements.txt 
	cd client && npm install && cd ..
	cd service-contract && npm install && cd .. 

build:
	touch $(VENV)/bin/activate
	mkdir -p cloak-tee/build
	cd cloak-tee/build/ && cmake .. -GNinja && ninja -j 4 && cd ../..
	cd service-contract && truffle compile && cd ..

run-sgx:
	cd cloak-tee/build &&  $(CURDIR)/cloak-tee/build/sandbox.sh -p libcloak.enclave.so.signed --enclave-type release

run-virtual:
	cd cloak-tee/build &&  $(CURDIR)/cloak-tee/build/sandbox.sh -p libcloak.virtual.so --enclave-type virtual
