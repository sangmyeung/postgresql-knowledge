#!/usr/bin/env python
# -*- coding: utf-8 -*-

class Color:
    RED = '\033[0;31m'
    GREEN = '\033[0;32m'
    YELLOW = '\033[0;33m'
    NONE = '\033[0m'

def print_colored_msg(color, msg):
    print("%s%s%s" % (color, msg, Color.NONE))
