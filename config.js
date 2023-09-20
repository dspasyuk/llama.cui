//Copyright Denis Spasyuk
//License MIT
var config = {}
config.params = [
	  '--model',
	  '../../models/orca_mini_v3_7b.Q5_0.gguf',
	  '--n-gpu-layers',
	  '28',
	  '-ins', '-b', '2048',
	  '--ctx_size',
	  '2048',
	  '--temp', '0.1',
	  '--top_k',
	  '100',
          '--multiline-input',
	  '--repeat_penalty',
	  '1.1',
	  '-t',
	  '8',
	  "--log-disable",
          "--no-penalize-nl"
];
config.llamacpp="../llama.cpp/main"
config.PORT = "5000";
config.IP= "localhost";
config.mongoDatabase = {database:false, collection:false};
config.DataFolder = './docs';
config.embedding = {database:false, documents:true};
config.embeddingPrefix= "Given the following information ";
	
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
//   -e                    process prompt escapes sequences (\n, \r, \t, \', \", \\)
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
//   -gqa N, --gqa N       grouped-query attention factor (TEMP!!! use 8 for LLaMAv2 70B) (default: 1)
//   -eps N, --rms-norm-eps N rms norm eps (TEMP!!! use 1e-5 for LLaMAv2) (default: 5.0e-06)
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
//   --chunks N            max number of chunks to process (default: -1, -1 = all)
//   --mlock               force system to keep model in RAM rather than swapping or compressing
//   --no-mmap             do not memory-map model (slower load but may reduce pageouts if not using mlock)
//   --numa                attempt optimizations that help on some NUMA systems
//                         if run without this previously, it is recommended to drop the system page cache before using this
//                         see https://github.com/ggerganov/llama.cpp/issues/1437
//   -ngl N, --n-gpu-layers N
//                         number of layers to store in VRAM
//   -ts SPLIT --tensor-split SPLIT
//                         how to split tensors across multiple GPUs, comma-separated list of proportions, e.g. 3,1
//   -mg i, --main-gpu i   the GPU to use for scratch and small tensors
//   -lv, --low-vram       don't allocate VRAM scratch buffer
//   -mmq, --mul-mat-q     use experimental mul_mat_q CUDA kernels instead of cuBLAS. TEMP!!!
//                         Reduces VRAM usage by 700/970/1430 MiB for 7b/13b/33b but prompt processing speed
//                         is still suboptimal, especially q2_K, q3_K, q5_K, and q6_K.
//   --mtest               compute maximum memory usage
//   --export              export the computation graph to 'llama.ggml'
//   --verbose-prompt      print prompt before generation
//   --simple-io           use basic IO for better compatibility in subprocesses and limited consoles
//   --lora FNAME          apply LoRA adapter (implies --no-mmap)
//   --lora-base FNAME     optional model to use as a base for the layers modified by the LoRA adapter
//   -m FNAME, --model FNAME
//                         model path (default: models/7B/ggml-model.bin)
