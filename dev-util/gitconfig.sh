#!/bin/bash
            
usage() 
{
    echo "Usage: $0 [local | global]"
    echo "  local      git config to local git project (default)"
    echo "  global     git config to user home"
    echo ""
    exit 1
}

target=$1
case $target in 
    global|local)
        ;;
    "")
        target=local
        ;;
    *)
        usage
esac

# cd to dev_home 
if [ "`pwd`" != "$ENV_HOME" ]; then
    cd $ENV_HOME
fi

# caching git password for 12 hours
git config --$target credential.helper "cache --timeout=43200"
git config --$target color.ui auto 
# git log graph
git config --$target alias.lg "log --color --graph --pretty=format:'%Cred%h%Creset -%C(yellow)%d%Creset %s %Cgreen(%cr) %C(bold blue)<%an>%Creset' --abbrev-commit"
git config --$target alias.co checkout
git config --$target alias.br branch
git config --$target alias.ci commit
git config --$target alias.df "diff --no-prefix"
git config --$target alias.st status
git config --$target alias.sts "status -s"
git config --$target alias.sh stash
git config --$target alias.sw switch
git config --$target alias.rt restore
git config --$target alias.unstage "reset HEAD --"
git config --$target alias.last "log -1 HEAD"
git config --$target alias.up "!git pull --rebase && git submodule update --recursive --remote"
git config --$target alias.find-merge "!sh -c 'commit=\$0 && branch=\${1:-HEAD} && (git rev-list \$commit..\$branch --ancestry-path | cat -n; git rev-list \$commit..\$branch --first-parent | cat -n) | sort -k2 -s | uniq -f1 -d | sort -n | tail -1 | cut -f2'"
git config --$target alias.show-merge "!sh -c 'merge=\$(git find-merge \$0 \$1) && [ -n \"\$merge\" ] && git show \$merge'"
# git log for date range: ex) git logdate 2021-11-01 2021-12-01
git config --$target alias.logdate "!f() { git log --after=\"\$1\" --until=\"\$2\"; }; f"
# diff settings
git config --$target diff.noprefix true
# disable 3-way merge when pull
git config --$target pull.rebase true
# push only current branch 
git config --$target push.default upstream
# forces submodules to be pushed separately
git config --$target push.recurseSubmodules check
# to make merge commit 
git config --$target branch.develop.mergeoptions --no-ff 
# igonre dev-util submodule dirty (don't care dev-util)
git config --$target submodule.dev-util.ignore all 
# Do not user etc template for git commit
git config --$target --unset-all commit.template

# Set timezone for git log
git config --$target log.date local

case "$PLATFORM_ID" in
    *WIN*)
        git config --$target core.autocrlf true
        ;;
    *)
        git config --$target core.autocrlf input
        ;;
esac

