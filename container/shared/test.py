import sys

def parseArg_(s, t):
  if t == 'int':
    return int(s)
  if t == 'string':
    return s
  if t == 'boolean':
    if s == '0':
      return False
    if s == '1':
      return True
    sys.stderr.write('Invalid boolean arg: %s\n' % s)
  sys.stderr.write('Invalid arg type: %s\n' % t)

def printAns_(ans):
  if type(ans).__name__ == 'int':
    sys.stdout.write('int ' + str(ans))
  elif type(ans).__name__ == 'bool':
    sys.stdout.write('boolean ' + ('1' if ans else '0'))
  elif type(ans).__name__ == 'str':
    sys.stdout.write('string ' + ans)
  else:
    sys.stderr.write('Unexpected return type: ' + type(ans).__name__)


def main_():
  if len(sys.argv) % 2 != 1:
    sys.stderr.write('Expected odd length of sys.argv: %d\n' % len(sys.argv))
    return
  args = []
  for i in range(1, len(sys.argv), 2):
    args.append(parseArg_(sys.argv[i], sys.argv[i+1]))
  ans = None
  if len(args) == 0:
    ans = f()
  elif len(args) == 1:
    ans = f(args[0])
  elif len(args) == 2:
    ans = f(args[0], args[1])
  elif len(args) == 3:
    ans = f(args[0], args[1], args[2])
  else:
    sys.stderr.write('Too many args: %d\n' % len(args))
  printAns_(ans)

main_()