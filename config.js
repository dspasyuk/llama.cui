//Copyright Denis Spasyuk
//License MIT

var config = {};

//Model Setting
config.params = [
  "--model",
  "../../models/dolphin-2.1-mistral-7b.Q5_0.gguf", //best so far for embedding
  "--n-gpu-layers",
  "15",
  "--keep",
  "20",
  "-ins",
  "-b",
  "2048",
  "--ctx_size",
  "2048",
  "--temp",
  "0",
  "--top_k",
  "10",
  "--multiline-input",
  "--repeat_penalty",
  "1.2",
  "-t",
  "4",
  "-r",
  "/n>",
  "-f",
  "./Alice.txt",
  "--cfg-negative-prompt",
  "Do not include any false information",
  "--log-disable",
  "--no-penalize-nl",
];

//Llama.cpp settings
config.llamacpp = "../llama.cpp/main";

//Llama.cui settings
config.PORT = { client: "5000", server: "5000" };
config.IP = { client: "localhost", server: "localhost" };
config.login = true;
config.timeout = 50000;
config.session = {
  secret: "2C44-4D44-WppQ38S", //change before deployment
  resave: true,
  saveUninitialized: true,
};

config.loginTrue = async function () {
  const hash = require("./hash.js");
  config.username = "admin";
  config.password = await hash.cryptPassword("12345");
};

if (config.login) {
  config.loginTrue();
};

config.dataChannel = new Map();
config.dataChannel.set("Documents", {
  datastream: "Documents",
  datafolder: "./docs",
  slice: 2000,
  vectordb: "Documents.js",
});

config.dataChannel.set("MongoDB", {
  datastream: "MongoDB",
  database: "fortknox",
  collection: "clientlist",
  url: "MongoDB://localhost:27017/",
  vectordb: "mongodb.js",
  slice: 2000,
});

config.dataChannel.set("WebSearch", { datastream: "WebSearch", slice: 2000 });
config.embedding = { MongoDB: false, Documents: true, WebSearch: false };
config.prompt = function(userID, prompt, context){
  return `User ID: '${userID}'; User Prompt: '${prompt}'; Context:'${context||""}'`;
}

//Piper setting
config.piper = {
  enabled: false,
  exec: "/home/denis/CODE/piper/install/piper",
  model: "/home/denis/CODE/piper/models/semaine/en_GB-semaine-medium.onnx",
};

try {
  module.exports = exports = config;
} catch (e) {}

// options:
//   -h, --help            show this help message and exit
//   -i, --interactive     run in interactive mode
//   --interactive-first   run in interactive mode and wait for input right away
//   -ins, --instruct      run in instruction mode (use with Alpaca models)
//   --multiline-input     allows you to write or paste multiple lines without ending each in '\'
//   -r PROMPT, --reverse-prompt PROMPT
//                         halt generation at PROMPT, return control in interactive mode
//                         (can be specified more than once for multiple prompts).
//   --color               colorise output to distinguish prompt and user input from generations
//   -s SEED, --seed SEED  RNG seed (default: -1, use random seed for < 0)
//   -t N, --threads N     number of threads to use during computation (default: 8)
//   -p PROMPT, --prompt PROMPT
//                         prompt to start generation with (default: empty)
//   -e, --escape          process prompt escapes sequences (\n, \r, \t, \', \", \\)
//   --prompt-cache FNAME  file to cache prompt state for faster startup (default: none)
//   --prompt-cache-all    if specified, saves user input and generations to cache as well.
//                         not supported with --interactive or other interactive options
//   --prompt-cache-ro     if specified, uses the prompt cache but does not update it.
//   --random-prompt       start with a randomized prompt.
//   --in-prefix-bos       prefix BOS to user inputs, preceding the `--in-prefix` string
//   --in-prefix STRING    string to prefix user inputs with (default: empty)
//   --in-suffix STRING    string to suffix after user inputs with (default: empty)
//   -f FNAME, --file FNAME
//                         prompt file to start generation.
//   -n N, --n-predict N   number of tokens to predict (default: -1, -1 = infinity, -2 = until context filled)
//   -c N, --ctx-size N    size of the prompt context (default: 512)
//   -b N, --batch-size N  batch size for prompt processing (default: 512)
//   --top-k N             top-k sampling (default: 40, 0 = disabled)
//   --top-p N             top-p sampling (default: 0.9, 1.0 = disabled)
//   --tfs N               tail free sampling, parameter z (default: 1.0, 1.0 = disabled)
//   --typical N           locally typical sampling, parameter p (default: 1.0, 1.0 = disabled)
//   --repeat-last-n N     last n tokens to consider for penalize (default: 64, 0 = disabled, -1 = ctx_size)
//   --repeat-penalty N    penalize repeat sequence of tokens (default: 1.1, 1.0 = disabled)
//   --presence-penalty N  repeat alpha presence penalty (default: 0.0, 0.0 = disabled)
//   --frequency-penalty N repeat alpha frequency penalty (default: 0.0, 0.0 = disabled)
//   --mirostat N          use Mirostat sampling.
//                         Top K, Nucleus, Tail Free and Locally Typical samplers are ignored if used.
//                         (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0)
//   --mirostat-lr N       Mirostat learning rate, parameter eta (default: 0.1)
//   --mirostat-ent N      Mirostat target entropy, parameter tau (default: 5.0)
//   -l TOKEN_ID(+/-)BIAS, --logit-bias TOKEN_ID(+/-)BIAS
//                         modifies the likelihood of token appearing in the completion,
//                         i.e. `--logit-bias 15043+1` to increase likelihood of token ' Hello',
//                         or `--logit-bias 15043-1` to decrease likelihood of token ' Hello'
//   --grammar GRAMMAR     BNF-like grammar to constrain generations (see samples in grammars/ dir)
//   --grammar-file FNAME  file to read grammar from
//   --cfg-negative-prompt PROMPT
//                         negative prompt to use for guidance. (default: empty)
//   --cfg-negative-prompt-file FNAME
//                         negative prompt file to use for guidance. (default: empty)
//   --cfg-scale N         strength of guidance (default: 1.000000, 1.0 = disable)
//   --rope-scale N        RoPE context linear scaling factor, inverse of --rope-freq-scale (default: 1)
//   --rope-freq-base N    RoPE base frequency, used by NTK-aware scaling (default: 10000.0)
//   --rope-freq-scale N   RoPE frequency linear scaling factor, inverse of --rope-scale (default: 1)
//   --ignore-eos          ignore end of stream token and continue generating (implies --logit-bias 2-inf)
//   --no-penalize-nl      do not penalize newline token
//   --memory-f32          use f32 instead of f16 for memory key+value (default: disabled)
//                         not recommended: doubles context memory required and no measurable increase in quality
//   --temp N              temperature (default: 0.8)
//   --perplexity          compute perplexity over each ctx window of the prompt
//   --hellaswag           compute HellaSwag score over random tasks from datafile supplied with -f
//   --hellaswag-tasks N   number of tasks to use when computing the HellaSwag score (default: 400)
//   --keep N              number of tokens to keep from the initial prompt (default: 0, -1 = all)
//   --draft N             number of tokens to draft for speculative decoding (default: 16)
//   --chunks N            max number of chunks to process (default: -1, -1 = all)
//   --mlock               force system to keep model in RAM rather than swapping or compressing
//   --no-mmap             do not memory-map model (slower load but may reduce pageouts if not using mlock)
//   --numa                attempt optimizations that help on some NUMA systems
//                         if run without this previously, it is recommended to drop the system page cache before using this
//                         see https://github.com/ggerganov/llama.cpp/issues/1437
//   -ngl N, --n-gpu-layers N
//                         number of layers to store in VRAM
//   -ngld N, --n-gpu-layers-draft N
//                         number of layers to store in VRAM for the draft model
//   -ts SPLIT --tensor-split SPLIT
//                         how to split tensors across multiple GPUs, comma-separated list of proportions, e.g. 3,1
//   -mg i, --main-gpu i   the GPU to use for scratch and small tensors
//   -lv, --low-vram       don't allocate VRAM scratch buffer
//   -nommq, --no-mul-mat-q
//                         use cuBLAS instead of custom mul_mat_q CUDA kernels.
//                         Not recommended since this is both slower and uses more VRAM.
//   --export              export the computation graph to 'llama.ggml'
//   --verbose-prompt      print prompt before generation
//   --simple-io           use basic IO for better compatibility in subprocesses and limited consoles
//   --lora FNAME          apply LoRA adapter (implies --no-mmap)
//   --lora-base FNAME     optional model to use as a base for the layers modified by the LoRA adapter
//   -m FNAME, --model FNAME
//                         model path (default: models/7B/ggml-model-f16.gguf)
//   -md FNAME, --model-draft FNAME
//                         draft model for speculative decoding (default: models/7B/ggml-model-f16.gguf)
//   -ld LOGDIR, --logdir LOGDIR
//                         path under which to save YAML logs (no logging if unset)

// log options:
//   --log-test            Run simple logging test
//   --log-disable         Disable trace logs
//   --log-enable          Enable trace logs
//   --log-file            Specify a log filename (without extension)
//                         Log file will be tagged with unique ID and written as "<name>.<ID>.log"
