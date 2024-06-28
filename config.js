//Copyright Denis Spasyuk
//License MIT
const path = require("path");
const prmt = require("./prompt.js");
const fs = require('fs');
var config = {};

config.modelrepo = "QuantFactory/Meta-Llama-3-8B-Instruct-GGUF";
config.modeldirectory = "../../models";
config.modelname = "Meta-Llama-3-8B-Instruct_Q4_K_S.gguf";

//Model Setting
config.systemPrompt= fs.readFileSync('Alice.txt', 'utf8');

config.params = {
  "--model":  path.join(config.modeldirectory, config.modelname),
  "--n-gpu-layers": 28, // remove if using CPU !!!!!!!!!!!!!
  "-cnv":"",
  "--interactive":"",
  "--interactive-first":"",
  "--simple-io":"",
  "-b": 2048,
  "-n":"-1",
  "-e":"",
  "--ctx_size":0,
  "--temp":0.3,
  "--top_k":10,
  "--multiline-input":"",
  "--repeat_penalty": 1.12,
  "-t": 6,
  "-r": '<|start_header_id|>user',
  //"--log-disable":"",
  "--no-display-prompt":"",
  //"-p":`'${config.systemPrompt}'`,
}

//Llama.cpp settings
config.llamacpp = "../llama.cpp/llama-cli";

//Llama.cui settings//
config.PORT = { client: "5000", server: "5000" };
config.IP = { client: "localhost", server: "localhost" };
config.login = false;
config.timeout = 50000;
config.session = {
  secret: "2C44-4D44-WppQ38S", //change before deployment
  resave: true,
  saveUninitialized: true,
  store: "",
  cookie: {
    secure: false, // will change to true when deploying to production
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 100000, // 24 hours
    sameSite: true,
  },
};

config.loginTrue = async function (user) {
  const hash = require("./hash.js");
  const userdb = [{ username:"admin", password: await hash.cryptPassword("12345")}];
  var theuser = userdb.find(({ username }) => username === user)
  return theuser;
};

config.dataChannel = new Map();
config.dataChannel.set("Documents", {
  datastream: "Documents", 
  datafolder: "./docs",
  slice: 2000,
  vectordb: "Documents.js"
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
config.filter =function(output){
  return output.replace(/<\|.*?\|>/g, '');
}

//adjust model prompt
config.prompt = function(userID, prompt, context, firstchat){
  console.log(prmt.promptFormatLAMA3(config.systemPrompt, prompt, context, firstchat)); 
  return prmt.promptFormatLAMA3(config.systemPrompt, prompt, context, firstchat); 
}
//filter any unwanted model outputs or change formating here
config.outputFilter = function(output){
  return config.filter(output);
}

//Piper setting
config.piper = {
  enabled: true,
  rate: 20500,
  // rate: 16000,
  output_file: 'S16_LE',
  exec: "../../piper/install/piper",
  model: "../../piper/models/librits/en_US-libritts_r-medium.onnx", 
};

config.testQuestions = config.testQuestions = `
Answer the following questions:
1. The day before two days after the day before tomorrow is Saturday. What day is it today?
2. What is the square root of 169?
3. Solve the equation 3y = 6y + 11 and find y.
4. There are two ducks in front of a duck, two ducks behind a duck, and a duck in the middle. How many ducks are there?
5. How many days does it take to travel from New York City to London by plane, assuming non-stop flights and average speeds?
6. What are the products of the chemical reaction between salicylic acid and acetic anhydride?
7. If five cats can catch five mice in five minutes, how long will it take one cat to catch one mouse?
8. Create a JS program that prints the first 100 Fibonacci numbers.
`


try {
  module.exports = exports = config;
} catch (e) {}

// general:

//   -h,    --help, --usage          print usage and exit
//          --version                show version and build info
//   -v,    --verbose                print verbose information
//          --verbosity N            set specific verbosity level (default: 0)
//          --verbose-prompt         print a verbose prompt before generation (default: false)
//          --no-display-prompt      don't print prompt at generation (default: false)
//   -co,   --color                  colorise output to distinguish prompt and user input from generations (default: false)
//   -s,    --seed SEED              RNG seed (default: -1, use random seed for < 0)
//   -t,    --threads N              number of threads to use during generation (default: 8)
//   -tb,   --threads-batch N        number of threads to use during batch and prompt processing (default: same as --threads)
//   -td,   --threads-draft N        number of threads to use during generation (default: same as --threads)
//   -tbd,  --threads-batch-draft N  number of threads to use during batch and prompt processing (default: same as --threads-draft)
//          --draft N                number of tokens to draft for speculative decoding (default: 5)
//   -ps,   --p-split N              speculative decoding split probability (default: 0.1)
//   -lcs,  --lookup-cache-static FNAME
//                                   path to static lookup cache to use for lookup decoding (not updated by generation)
//   -lcd,  --lookup-cache-dynamic FNAME
//                                   path to dynamic lookup cache to use for lookup decoding (updated by generation)
//   -c,    --ctx-size N             size of the prompt context (default: 0, 0 = loaded from model)
//   -n,    --predict N              number of tokens to predict (default: -1, -1 = infinity, -2 = until context filled)
//   -b,    --batch-size N           logical maximum batch size (default: 2048)
//   -ub,   --ubatch-size N          physical maximum batch size (default: 512)
//          --keep N                 number of tokens to keep from the initial prompt (default: 0, -1 = all)
//          --chunks N               max number of chunks to process (default: -1, -1 = all)
//   -fa,   --flash-attn             enable Flash Attention (default: disabled)
//   -p,    --prompt PROMPT          prompt to start generation with (default: '')
//   -f,    --file FNAME             a file containing the prompt (default: none)
//          --in-file FNAME          an input file (repeat to specify multiple files)
//   -bf,   --binary-file FNAME      binary file containing the prompt (default: none)
//   -e,    --escape                 process escapes sequences (\n, \r, \t, \', \", \\) (default: true)
//          --no-escape              do not process escape sequences
//   -ptc,  --print-token-count N    print token count every N tokens (default: -1)
//          --prompt-cache FNAME     file to cache prompt state for faster startup (default: none)
//          --prompt-cache-all       if specified, saves user input and generations to cache as well
//                                   not supported with --interactive or other interactive options
//          --prompt-cache-ro        if specified, uses the prompt cache but does not update it
//   -r,    --reverse-prompt PROMPT  halt generation at PROMPT, return control in interactive mode
//                                   can be specified more than once for multiple prompts
//   -sp,   --special                special tokens output enabled (default: false)
//   -cnv,  --conversation           run in conversation mode (does not print special tokens and suffix/prefix) (default: false)
//   -i,    --interactive            run in interactive mode (default: false)
//   -if,   --interactive-first      run in interactive mode and wait for input right away (default: false)
//   -mli,  --multiline-input        allows you to write or paste multiple lines without ending each in '\'
//          --in-prefix-bos          prefix BOS to user inputs, preceding the `--in-prefix` string
//          --in-prefix STRING       string to prefix user inputs with (default: empty)
//          --in-suffix STRING       string to suffix after user inputs with (default: empty)

// sampling:

//          --samplers SAMPLERS      samplers that will be used for generation in the order, separated by ';'
//                                   (default: top_k;tfs_z;typical_p;top_p;min_p;temperature)
//          --sampling-seq SEQUENCE  simplified sequence for samplers that will be used (default: kfypmt)
//          --ignore-eos             ignore end of stream token and continue generating (implies --logit-bias EOS-inf)
//          --penalize-nl            penalize newline tokens (default: false)
//          --temp N                 temperature (default: 0.8)
//          --top-k N                top-k sampling (default: 40, 0 = disabled)
//          --top-p N                top-p sampling (default: 0.9, 1.0 = disabled)
//          --min-p N                min-p sampling (default: 0.1, 0.0 = disabled)
//          --tfs N                  tail free sampling, parameter z (default: 1.0, 1.0 = disabled)
//          --typical N              locally typical sampling, parameter p (default: 1.0, 1.0 = disabled)
//          --repeat-last-n N        last n tokens to consider for penalize (default: 64, 0 = disabled, -1 = ctx_size)
//          --repeat-penalty N       penalize repeat sequence of tokens (default: 1.0, 1.0 = disabled)
//          --presence-penalty N     repeat alpha presence penalty (default: 0.0, 0.0 = disabled)
//          --frequency-penalty N    repeat alpha frequency penalty (default: 0.0, 0.0 = disabled)
//          --dynatemp-range N       dynamic temperature range (default: 0.0, 0.0 = disabled)
//          --dynatemp-exp N         dynamic temperature exponent (default: 1.0)
//          --mirostat N             use Mirostat sampling.
//                                   Top K, Nucleus, Tail Free and Locally Typical samplers are ignored if used.
//                                   (default: 0, 0 = disabled, 1 = Mirostat, 2 = Mirostat 2.0)
//          --mirostat-lr N          Mirostat learning rate, parameter eta (default: 0.1)
//          --mirostat-ent N         Mirostat target entropy, parameter tau (default: 5.0)
//          -l TOKEN_ID(+/-)BIAS     modifies the likelihood of token appearing in the completion,
//                                   i.e. `--logit-bias 15043+1` to increase likelihood of token ' Hello',
//                                   or `--logit-bias 15043-1` to decrease likelihood of token ' Hello'
//          --cfg-negative-prompt PROMPT
//                                   negative prompt to use for guidance (default: '')
//          --cfg-negative-prompt-file FNAME
//                                   negative prompt file to use for guidance
//          --cfg-scale N            strength of guidance (default: 1.0, 1.0 = disable)

// grammar:

//          --grammar GRAMMAR        BNF-like grammar to constrain generations (see samples in grammars/ dir) (default: '')
//          --grammar-file FNAME     file to read grammar from
//   -j,    --json-schema SCHEMA     JSON schema to constrain generations (https://json-schema.org/), e.g. `{}` for any JSON object
//                                   For schemas w/ external $refs, use --grammar + example/json_schema_to_grammar.py instead

// embedding:

//          --pooling {none,mean,cls}
//                                   pooling type for embeddings, use model default if unspecified

// context hacking:

//          --rope-scaling {none,linear,yarn}
//                                   RoPE frequency scaling method, defaults to linear unless specified by the model
//          --rope-scale N           RoPE context scaling factor, expands context by a factor of N
//          --rope-freq-base N       RoPE base frequency, used by NTK-aware scaling (default: loaded from model)
//          --rope-freq-scale N      RoPE frequency scaling factor, expands context by a factor of 1/N
//          --yarn-orig-ctx N        YaRN: original context size of model (default: 0 = model training context size)
//          --yarn-ext-factor N      YaRN: extrapolation mix factor (default: -1.0, 0.0 = full interpolation)
//          --yarn-attn-factor N     YaRN: scale sqrt(t) or attention magnitude (default: 1.0)
//          --yarn-beta-slow N       YaRN: high correction dim or alpha (default: 1.0)
//          --yarn-beta-fast N       YaRN: low correction dim or beta (default: 32.0)
//   -gan,  --grp-attn-n N           group-attention factor (default: 1)
//   -gaw,  --grp-attn-w N           group-attention width (default: 512.0)
//   -dkvc, --dump-kv-cache          verbose print of the KV cache
//   -nkvo, --no-kv-offload          disable KV offload
//   -ctk,  --cache-type-k TYPE      KV cache data type for K (default: f16)
//   -ctv,  --cache-type-v TYPE      KV cache data type for V (default: f16)

// perplexity:

//          --all-logits             return logits for all tokens in the batch (default: false)
//          --hellaswag              compute HellaSwag score over random tasks from datafile supplied with -f
//          --hellaswag-tasks N      number of tasks to use when computing the HellaSwag score (default: 400)
//          --winogrande             compute Winogrande score over random tasks from datafile supplied with -f
//          --winogrande-tasks N     number of tasks to use when computing the Winogrande score (default: 0)
//          --multiple-choice        compute multiple choice score over random tasks from datafile supplied with -f
//          --multiple-choice-tasks N
//                                   number of tasks to use when computing the multiple choice score (default: 0)
//          --kl-divergence          computes KL-divergence to logits provided via --kl-divergence-base
//          --ppl-stride N           stride for perplexity calculation (default: 0)
//          --ppl-output-type {0,1}  output type for perplexity calculation (default: 0)

// parallel:

//   -dt,   --defrag-thold N         KV cache defragmentation threshold (default: -1.0, < 0 - disabled)
//   -np,   --parallel N             number of parallel sequences to decode (default: 1)
//   -ns,   --sequences N            number of sequences to decode (default: 1)
//   -cb,   --cont-batching          enable continuous batching (a.k.a dynamic batching) (default: enabled)

// multi-modality:

//          --mmproj FILE            path to a multimodal projector file for LLaVA. see examples/llava/README.md
//          --image FILE             path to an image file. use with multimodal models. Specify multiple times for batching

// backend:

//          --rpc SERVERS            comma separated list of RPC servers
//          --mlock                  force system to keep model in RAM rather than swapping or compressing
//          --no-mmap                do not memory-map model (slower load but may reduce pageouts if not using mlock)
//          --numa TYPE              attempt optimizations that help on some NUMA systems
//                                     - distribute: spread execution evenly over all nodes
//                                     - isolate: only spawn threads on CPUs on the node that execution started on
//                                     - numactl: use the CPU map provided by numactl
//                                   if run without this previously, it is recommended to drop the system page cache before using this
//                                   see https://github.com/ggerganov/llama.cpp/issues/1437
//   -ngl,  --gpu-layers N           number of layers to store in VRAM
//   -ngld, --gpu-layers-draft N     number of layers to store in VRAM for the draft model
//   -sm,   --split-mode SPLIT_MODE  how to split the model across multiple GPUs, one of:
//                                     - none: use one GPU only
//                                     - layer (default): split layers and KV across GPUs
//                                     - row: split rows across GPUs
//   -ts,   --tensor-split SPLIT     fraction of the model to offload to each GPU, comma-separated list of proportions, e.g. 3,1
//   -mg,   --main-gpu i             the GPU to use for the model (with split-mode = none),
//                                   or for intermediate results and KV (with split-mode = row) (default: 0)

// model:

//          --check-tensors          check model tensor data for invalid values (default: false)
//          --override-kv KEY=TYPE:VALUE
//                                   advanced option to override model metadata by key. may be specified multiple times.
//                                   types: int, float, bool, str. example: --override-kv tokenizer.ggml.add_bos_token=bool:false
//          --lora FNAME             apply LoRA adapter (implies --no-mmap)
//          --lora-scaled FNAME S    apply LoRA adapter with user defined scaling S (implies --no-mmap)
//          --lora-base FNAME        optional model to use as a base for the layers modified by the LoRA adapter
//          --control-vector FNAME   add a control vector
//          --control-vector-scaled FNAME SCALE
//                                   add a control vector with user defined scaling SCALE
//          --control-vector-layer-range START END
//                                   layer range to apply the control vector(s) to, start and end inclusive
//   -m,    --model FNAME            model path (default: models/$filename with filename from --hf-file
//                                   or --model-url if set, otherwise models/7B/ggml-model-f16.gguf)
//   -md,   --model-draft FNAME      draft model for speculative decoding (default: unused)
//   -mu,   --model-url MODEL_URL    model download url (default: unused)
//   -hfr,  --hf-repo REPO           Hugging Face model repository (default: unused)
//   -hff,  --hf-file FILE           Hugging Face model file (default: unused)

// retrieval:

//          --context-file FNAME     file to load context from (repeat to specify multiple files)
//          --chunk-size N           minimum length of embedded text chunks (default: 64)
//          --chunk-separator STRING 
//                                   separator between chunks (default: '
//                                   ')

// passkey:

//          --junk N                 number of times to repeat the junk text (default: 250)
//          --pos N                  position of the passkey in the junk text (default: -1)

// imatrix:

//   -o,    --output FNAME           output file (default: 'imatrix.dat')
//          --output-frequency N     output the imatrix every N iterations (default: 10)
//          --save-frequency N       save an imatrix copy every N iterations (default: 0)
//          --process-output         collect data for the output tensor (default: false)
//          --no-ppl                 do not compute perplexity (default: true)
//          --chunk N                start processing the input from chunk N (default: 0)

// bench:

//   -pps                            is the prompt shared across parallel sequences (default: false)
//   -npp n0,n1,...                  number of prompt tokens
//   -ntg n0,n1,...                  number of text generation tokens
//   -npl n0,n1,...                  number of parallel prompts

// server:

//          --host HOST              ip address to listen (default: 127.0.0.1)
//          --port PORT              port to listen (default: 8080)
//          --path PATH              path to serve static files from (default: )
//          --embedding(s)           enable embedding endpoint (default: disabled)
//          --api-key KEY            API key to use for authentication (default: none)
//          --api-key-file FNAME     path to file containing API keys (default: none)
//          --ssl-key-file FNAME     path to file a PEM-encoded SSL private key
//          --ssl-cert-file FNAME    path to file a PEM-encoded SSL certificate
//          --timeout N              server read/write timeout in seconds (default: 600)
//          --threads-http N         number of threads used to process HTTP requests (default: -1)
//          --system-prompt-file FNAME
//                                   set a file to load a system prompt (initial prompt of all slots), this is useful for chat applications
//          --log-format {text,json} 
//                                   log output format: json or text (default: json)
//          --metrics                enable prometheus compatible metrics endpoint (default: disabled)
//          --no-slots               disables slots monitoring endpoint (default: enabled)
//          --slot-save-path PATH    path to save slot kv cache (default: disabled)
//          --chat-template JINJA_TEMPLATE
//                                   set custom jinja chat template (default: template taken from model's metadata)
//                                   only commonly used templates are accepted:
//                                   https://github.com/ggerganov/llama.cpp/wiki/Templates-supported-by-llama_chat_apply_template
//   -sps,  --slot-prompt-similarity SIMILARITY
//                                   how much the prompt of a request must match the prompt of a slot in order to use that slot (default: 0.50, 0.0 = disabled)
                                  

// logging:

//          --simple-io              use basic IO for better compatibility in subprocesses and limited consoles
//   -ld,   --logdir LOGDIR          path under which to save YAML logs (no logging if unset)
//          --log-test               Run simple logging test
//          --log-disable            Disable trace logs
//          --log-enable             Enable trace logs
//          --log-file FNAME         Specify a log filename (without extension)
//          --log-new                Create a separate new log file on start. Each log file will have unique name: "<name>.<ID>.log"
//          --log-append             Don't truncate the old log file.

// cvector:

//   -o,    --output FNAME           output file (default: 'control_vector.gguf')
//          --positive-file FNAME    positive prompts file, one prompt per line (default: 'examples/cvector-generator/positive.txt')
//          --negative-file FNAME    negative prompts file, one prompt per line (default: 'examples/cvector-generator/negative.txt')
//          --completions-file FNAME 
//                                   completions file (default: 'examples/cvector-generator/completions.txt')
//          --completions N          number of lines of completions file to use (default: 64)
//          --pca-batch N            batch size used for PCA. Larger batch runs faster, but uses more memory (default: 20)
//          --pca-iter N             number of iterations used for PCA (default: 1000)
